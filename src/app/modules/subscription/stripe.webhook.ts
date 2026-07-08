import { Request, Response } from "express";
import Stripe from "stripe";
import { configs } from "../../configs";
import { Subscription_Model } from "./subscription.schema";
import { SubscriptionPlan_Model } from "./subscription.plans";
import { Payment_Model } from "./payment.schema";
import { Account_Model } from "../auth/auth.schema";
import { referral_services } from "../referral/referral.service";
import { notification_services } from "../notification/notification.service";
import { badge_services } from "../badge/badge.service";
import logger from "../../configs/logger";

// @ts-ignore - Stripe types issue with v22
const stripe = new Stripe(configs.stripe.secretKey!, {
  apiVersion: "2024-12-18.acacia",
});
const webhookSecret = configs.stripe.webhookSecret;

// Processed event IDs to prevent duplicate processing within this process lifetime
// For production-scale, use Redis for cross-process idempotency
const processedEvents = new Map<string, number>();
const EVENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if a Stripe event has already been processed (idempotency)
 */
function isEventProcessed(eventId: string): boolean {
  const cached = processedEvents.get(eventId);
  if (cached && Date.now() - cached < EVENT_CACHE_TTL) {
    return true;
  }
  // Clean expired entries
  for (const [key, timestamp] of processedEvents.entries()) {
    if (Date.now() - timestamp > EVENT_CACHE_TTL) {
      processedEvents.delete(key);
    }
  }
  return false;
}

function markEventProcessed(eventId: string) {
  processedEvents.set(eventId, Date.now());
}

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  let event: any;

  try {
    // Stripe requires raw body for webhook signature verification
    // The body should be a Buffer when using express.raw()
    const body =
      req.body instanceof Buffer
        ? req.body
        : Buffer.from(JSON.stringify(req.body));

    event = stripe.webhooks.constructEvent(body, sig, webhookSecret!);
    logger.info(`📥 Webhook received: ${event.type} (ID: ${event.id})`);

    // Idempotency check - reject already processed events
    if (isEventProcessed(event.id)) {
      logger.warn(`⚠️  Duplicate event detected, skipping: ${event.id}`);
      res.json({ received: true });
      return;
    }
  } catch (err: any) {
    logger.error(`❌ Webhook signature verification failed: ${err.message}`);
    res.status(400).json({
      error: "Webhook signature verification failed",
      message: err.message,
    });
    return;
  }

  // Route to appropriate handler
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;

      default:
        logger.warn(`⚠️  Unhandled event type: ${event.type}`);
    }

    // Mark event as processed after successful handling
    markEventProcessed(event.id);

    res.json({ received: true });
  } catch (error: any) {
    logger.error(`❌ Error handling webhook event ${event.type}:`, error);
    res.status(500).json({
      error: "Webhook handler failed",
      message: error.message,
    });
  }
};

/**
 * Map Stripe price ID to our internal plan ID
 * Uses the stripePriceId field from subscription_plans collection
 */
async function mapPriceIdToPlanId(
  stripePriceId: string,
): Promise<string | null> {
  const { SubscriptionPlan_Model } = await import("./subscription.plans");
  const plan = await SubscriptionPlan_Model.findOne({
    stripePriceId,
    isActive: true,
  });
  if (!plan) {
    logger.error(
      `❌ No matching plan found for Stripe price ID: ${stripePriceId}`,
    );
    return null;
  }
  return plan.planId;
}

// Handler Functions
async function handleCheckoutCompleted(session: any) {
  try {
    const accountId = session.metadata?.accountId;
    const planId = session.metadata?.planId;
    const subscriptionId = session.subscription as string;

    if (!accountId || !planId || !subscriptionId) {
      logger.error("❌ Missing metadata in checkout session:", {
        accountId,
        planId,
        subscriptionId,
      });
      throw new Error(
        "Missing required metadata in checkout.session.completed: accountId, planId, or subscriptionId",
      );
    }

    // Retrieve full subscription from Stripe
    const stripeSubscription =
      await stripe.subscriptions.retrieve(subscriptionId);

    // Create or update subscription record
    await Subscription_Model.findOneAndUpdate(
      { accountId },
      {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        planId,
        status: stripeSubscription.status,
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000,
        ),
        trialEndsAt: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: false,
        autoRenew: true,
        nextBillingDate: new Date(stripeSubscription.current_period_end * 1000),
        signalsUsed: 0, // Reset usage for new subscription
        lastPaymentDate: new Date(),
      },
      { upsert: true, new: true },
    );

    // Resolve tier from the database plan (not planId string parsing)
    const { SubscriptionPlan_Model: PlanModel } = await import("./subscription.plans");
    const plan = await PlanModel.findOne({ planId });
    const subscriptionTier = plan?.tier ?? "pro";
    const planName = plan?.name ?? planId;
    const accountUpdate: Record<string, unknown> = {
      stripeCustomerId: session.customer as string,
      subscriptionStatus: stripeSubscription.status,
      subscriptionTier,
      subscriptionExpiresAt: new Date(
        stripeSubscription.current_period_end * 1000,
      ),
    };

    if (stripeSubscription.status === "trialing") {
      accountUpdate.trialUsed = true;
    }

    // Update account
    await Account_Model.findByIdAndUpdate(accountId, accountUpdate);

    // Handle Referral logic
    await referral_services.complete_referral_in_db(accountId);
    await notification_services.create_notification({
      accountId,
      type: "subscription_active",
      title: "Subscription Activated! 🎉",
      message: `Your ${planName} subscription is now active. Enjoy all your trading features!`,
      link: "/subscription",
      data: {
        subscriptionId,
        planId,
        trialEndsAt: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000).toISOString()
          : null,
      },
    });

    void badge_services.evaluate_user_badges(accountId);

    logger.info(
      `✅ Subscription created for account: ${accountId}, plan: ${planId}`,
    );
  } catch (error) {
    logger.error("❌ Error in handleCheckoutCompleted:", error);
    throw error;
  }
}

async function handleInvoicePaid(invoice: any) {
  try {
    const subscriptionId = invoice.subscription as string;
    const paymentIntentId = invoice.payment_intent as string;

    if (!subscriptionId) {
      logger.warn("⚠️  No subscription ID in invoice");
      return;
    }

    // Check if payment intent already recorded (idempotency at DB level)
    if (paymentIntentId) {
      const existingPayment = await Payment_Model.findOne({
        stripePaymentIntentId: paymentIntentId,
      });
      if (existingPayment) {
        logger.info(
          `ℹ️  Payment already recorded for intent: ${paymentIntentId}`,
        );
        return;
      }
    }

    const subscription = await Subscription_Model.findOne({
      stripeSubscriptionId: subscriptionId,
    });
    if (!subscription) {
      logger.error("❌ Subscription not found for invoice:", subscriptionId);
      return;
    }

    // Record payment
    await Payment_Model.create({
      accountId: subscription.accountId,
      subscriptionId: subscription._id,
      stripePaymentIntentId: paymentIntentId || `invoice_${invoice.id}`,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: "succeeded",
      paymentMethod: "card",
      description: `Subscription renewal - ${subscription.planId}`,
      invoiceUrl: invoice.hosted_invoice_url || "",
    });

    // Update subscription
    await Subscription_Model.findByIdAndUpdate(subscription._id, {
      status: "active",
      lastPaymentDate: new Date(),
      nextBillingDate:
        new Date(invoice.lines?.data[0]?.period.end * 1000) || null,
      currentPeriodStart: new Date(invoice.period_start * 1000),
      currentPeriodEnd: new Date(invoice.period_end * 1000),
      signalsUsed: 0, // Reset usage on renewal
    });

    // Update account
    await Account_Model.findByIdAndUpdate(subscription.accountId, {
      subscriptionStatus: "active",
      subscriptionExpiresAt: new Date(invoice.period_end * 1000),
    });

    // Notify user about successful renewal
    await notification_services.create_notification({
      accountId: subscription.accountId.toString(),
      type: "subscription_active",
      title: "Subscription Renewed ✅",
      message: `Your subscription has been renewed successfully. Billing period ends ${new Date(invoice.period_end * 1000).toLocaleDateString()}.`,
      link: "/subscription",
      data: {
        subscriptionId: subscription._id.toString(),
        amount: invoice.amount_paid,
        currency: invoice.currency,
      },
    });

    // Notify about successful payment
    await notification_services.create_notification({
      accountId: subscription.accountId.toString(),
      type: "payment_succeeded",
      title: "Payment Received 💰",
      message: `Payment of ${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency?.toUpperCase() || "USD"} was processed successfully.`,
      link: "/subscription/payments",
      data: {
        paymentIntentId,
        amount: invoice.amount_paid,
        currency: invoice.currency,
      },
    });

    logger.info(
      `✅ Payment recorded: ${paymentIntentId}, amount: ${invoice.amount_paid}`,
    );
  } catch (error) {
    logger.error("❌ Error in handleInvoicePaid:", error);
    throw error;
  }
}

async function handleInvoiceFailed(invoice: any) {
  try {
    const subscriptionId = invoice.subscription as string;

    if (!subscriptionId) return;

    const subscription = await Subscription_Model.findOne({
      stripeSubscriptionId: subscriptionId,
    });
    if (!subscription) return;

    // Update subscription
    await Subscription_Model.findByIdAndUpdate(subscription._id, {
      status: "past_due",
    });

    // Update account
    await Account_Model.findByIdAndUpdate(subscription.accountId, {
      subscriptionStatus: "past_due",
    });

    // Notify user about failed payment
    await notification_services.create_notification({
      accountId: subscription.accountId.toString(),
      type: "payment_failed",
      title: "Payment Failed ⚠️",
      message: `Your subscription payment failed. Please update your payment method to avoid service interruption.`,
      link: "/subscription/billing",
      data: {
        subscriptionId: subscription._id.toString(),
        invoiceId: invoice.id,
      },
    });

    logger.warn(`⚠️  Payment failed for subscription: ${subscriptionId}`);
  } catch (error) {
    logger.error("❌ Error in handleInvoiceFailed:", error);
    throw error;
  }
}

async function handleSubscriptionUpdated(stripeSub: any) {
  try {
    const subscription = await Subscription_Model.findOne({
      stripeSubscriptionId: stripeSub.id,
    });

    if (!subscription) {
      logger.error("❌ Subscription not found for update:", stripeSub.id);
      return;
    }

    const updates: Record<string, unknown> = {
      status: stripeSub.status,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    };

    // If plan/price changed (check price ID)
    const newPriceId = stripeSub.items?.data[0]?.price.id;
    if (newPriceId) {
      // Map Stripe price ID to internal plan ID via database lookup
      const planId = await mapPriceIdToPlanId(newPriceId);
      if (planId) {
        updates.planId = planId;

        // Also update account tier based on new plan
        const tier = planId ? (await SubscriptionPlan_Model.findOne({ planId }))?.tier : null;
        if (tier) {
          await Account_Model.findByIdAndUpdate(subscription.accountId, {
            subscriptionTier: tier,
          });
        }
      }
    }

    await Subscription_Model.findByIdAndUpdate(subscription._id, updates);

    // Update account status and expiry
    await Account_Model.findByIdAndUpdate(subscription.accountId, {
      subscriptionStatus: stripeSub.status,
      subscriptionExpiresAt: new Date(stripeSub.current_period_end * 1000),
    });

    void badge_services.evaluate_user_badges(subscription.accountId.toString());

    logger.info(
      `🔄 Subscription updated: ${stripeSub.id}, status: ${stripeSub.status}`,
    );
  } catch (error) {
    logger.error("❌ Error in handleSubscriptionUpdated:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(stripeSub: any) {
  try {
    const subscription = await Subscription_Model.findOne({
      stripeSubscriptionId: stripeSub.id,
    });

    if (!subscription) return;

    await Subscription_Model.findByIdAndUpdate(subscription._id, {
      status: "canceled",
    });

    await Account_Model.findByIdAndUpdate(subscription.accountId, {
      subscriptionStatus: "canceled",
      subscriptionTier: "free",
      subscriptionExpiresAt: null,
    });

    // Notify user about subscription cancellation
    await notification_services.create_notification({
      accountId: subscription.accountId.toString(),
      type: "subscription_canceled",
      title: "Subscription Canceled",
      message: `Your subscription has been canceled. You've been moved to the Free plan. You can resubscribe anytime to regain full access.`,
      link: "/subscription",
      data: {
        subscriptionId: subscription._id.toString(),
        canceledAt: new Date().toISOString(),
      },
    });

    logger.info(`❌ Subscription canceled: ${stripeSub.id}`);
  } catch (error) {
    logger.error("❌ Error in handleSubscriptionDeleted:", error);
    throw error;
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  try {
    // Handle one-time payments (if any) - subscription payments are handled via invoice.paid
    logger.info(`💰 Payment succeeded: ${paymentIntent.id}`);
  } catch (error) {
    logger.error("❌ Error in handlePaymentSucceeded:", error);
    throw error;
  }
}

async function handleChargeRefunded(charge: any) {
  try {
    const payment = await Payment_Model.findOne({
      stripePaymentIntentId: charge.payment_intent as string,
    });

    if (!payment) return;

    await Payment_Model.findByIdAndUpdate(payment._id, {
      status: "refunded",
      refundedAt: new Date(),
      refundedAmount: charge.amount_refunded,
    });

    logger.info(`💸 Payment refunded: ${charge.id}`);
  } catch (error) {
    logger.error("❌ Error in handleChargeRefunded:", error);
    throw error;
  }
}
