import Stripe from "stripe";
import { configs } from "../../configs";

// @ts-ignore - Stripe types issue with v22
const stripe = new Stripe(configs.stripe.secretKey!, {
  apiVersion: "2024-12-18.acacia",
});

export const stripeService = {
  // Create Stripe Customer
  async createCustomer(email: string, name: string, accountId: string) {
    return stripe.customers.create({
      email,
      name,
      metadata: { accountId },
    });
  },

  // Get Stripe Customer
  async getCustomer(customerId: string) {
    return stripe.customers.retrieve(customerId);
  },

  // Create Stripe Product
  async createProduct(
    name: string,
    description: string,
    metadata?: Record<string, string>,
  ) {
    return stripe.products.create({
      name,
      description,
      metadata: metadata || {},
    });
  },

  // Create Stripe Price for a Product
  async createPrice(
    productId: string,
    unitAmount: number,
    currency: string,
    interval: "month" | "year" | "one_time" | "week",
  ) {
    return stripe.prices.create({
      product: productId,
      unit_amount: unitAmount,
      currency,
      recurring: interval !== "one_time" ? { interval } : undefined,
    });
  },

  // Sync Subscription Plan with Stripe (creates product + price only if needed)
  async syncPlanWithStripe(planData: {
    planId: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    interval: "month" | "year";
  }) {
    try {
      const unitAmount = planData.price * 100;
      let productId: string;
      let priceId: string | undefined;

      // 1. Search for existing product using list (more reliable than search which has indexing delay)
      const products = await stripe.products.list({
        active: true,
        limit: 100,
        expand: ["data.default_price"],
      });

      const existingProduct = products.data.find(
        (p: any) => p.metadata.planId === planData.planId,
      );

      if (existingProduct) {
        productId = existingProduct.id;
        console.log(
          `ℹ️  Found existing Stripe product for ${planData.planId}: ${productId}`,
        );

        // Update product info if changed
        if (
          existingProduct.name !== planData.name ||
          existingProduct.description !== planData.description
        ) {
          await stripe.products.update(productId, {
            name: planData.name,
            description: planData.description,
          });
        }
      } else {
        // Create new product if not found
        const product = await stripe.products.create({
          name: planData.name,
          description: planData.description,
          metadata: { planId: planData.planId },
        });
        productId = product.id;
        console.log(
          `🆕 Created new Stripe product for ${planData.planId}: ${productId}`,
        );
      }

      // 2. Search for existing price with this amount and interval for this product
      const existingPrices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 100,
      });

      const matchingPrice = existingPrices.data.find(
        (p: any) =>
          p.unit_amount === unitAmount &&
          p.currency === planData.currency.toLowerCase() &&
          p.recurring?.interval === planData.interval,
      );

      if (matchingPrice) {
        priceId = matchingPrice.id;
        console.log(
          `ℹ️  Found existing Stripe price for ${planData.planId}: ${priceId}`,
        );
      } else {
        // Create new price if not found
        const price = await stripe.prices.create({
          product: productId,
          unit_amount: unitAmount,
          currency: planData.currency,
          recurring: { interval: planData.interval },
        });
        priceId = price.id;
        console.log(
          `🆕 Created new Stripe price for ${planData.planId}: ${priceId}`,
        );
      }

      return {
        stripeProductId: productId,
        stripePriceId: priceId,
      };
    } catch (error: any) {
      console.error(
        `❌ Failed to sync plan "${planData.name}" with Stripe:`,
        error.message,
      );
      throw error;
    }
  },

  // Create Checkout Session
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>,
  ) {
    return stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
      allow_promotion_codes: true,
    });
  },

  // Create Checkout Session with Trial
  async createCheckoutSessionWithTrial(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    trialPeriodDays: number,
    metadata?: Record<string, string>,
  ) {
    return stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: trialPeriodDays,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
      allow_promotion_codes: true,
    });
  },

  // Create Billing Portal Session
  async createPortalSession(customerId: string, returnUrl: string) {
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  },

  // Get Subscription Details
  async getSubscription(subscriptionId: string) {
    return stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["default_payment_method"],
    });
  },

  // Cancel Subscription (at period end)
  async cancelSubscription(subscriptionId: string) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  },

  // Resume Canceled Subscription
  async resumeSubscription(subscriptionId: string) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  },

  // Update Subscription Plan (prorated)
  async updateSubscriptionPlan(subscriptionId: string, newPriceId: string) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItemId = subscription.items.data[0].id;

    return stripe.subscriptions.update(subscriptionId, {
      items: [{ id: currentItemId, price: newPriceId }],
      proration_behavior: "create_prorations",
    });
  },

  // Create One-Time Payment (Master Trader revenue share)
  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    description: string,
    metadata?: Record<string, string>,
  ) {
    return stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      description,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  },

  // Refund Payment
  async refundPayment(paymentIntentId: string, amount?: number) {
    return stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? amount * 100 : undefined, // Convert to cents
    });
  },

  // Get Invoice
  async getInvoice(invoiceId: string) {
    return stripe.invoices.retrieve(invoiceId);
  },

  // List Customer Invoices
  async listCustomerInvoices(customerId: string, limit: number = 10) {
    return stripe.invoices.list({
      customer: customerId,
      limit,
    });
  },

  // Get Payment Intent
  async getPaymentIntent(paymentIntentId: string) {
    return stripe.paymentIntents.retrieve(paymentIntentId);
  },
};
