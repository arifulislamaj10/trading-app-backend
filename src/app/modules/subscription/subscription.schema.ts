import { model, Schema } from 'mongoose';

export interface ISubscription {
  accountId: Schema.Types.ObjectId;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  signalsUsed: number;
  autoRenew: boolean;
  lastPaymentDate: Date | null;
  nextBillingDate: Date | null;
  expiryNotificationsSent?: Array<{
    daysBefore: number;
    periodEnd: Date;
    sentAt: Date;
  }>;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'account', required: true },
    stripeCustomerId: { type: String, required: true },
    stripeSubscriptionId: { type: String, required: true }, // Indexed via schema.index() below
    planId: { type: String, required: true }, // Indexed via schema.index() below
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing', 'paused'],
      default: 'active',
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    trialEndsAt: { type: Date, default: null },
    signalsUsed: { type: Number, default: 0 },
    autoRenew: { type: Boolean, default: true },
    lastPaymentDate: { type: Date, default: null },
    nextBillingDate: { type: Date, default: null },
    expiryNotificationsSent: {
      type: [
        {
          daysBefore: { type: Number, required: true },
          periodEnd: { type: Date, required: true },
          sentAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

// Indexes for optimized queries (defined here to avoid duplicate index warnings)
subscriptionSchema.index({ accountId: 1, status: 1 }); // Compound index for account queries
subscriptionSchema.index({ stripeCustomerId: 1 }); // Stripe customer lookup
subscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true }); // Unique constraint
subscriptionSchema.index({ planId: 1 }); // Plan filtering
subscriptionSchema.index({ currentPeriodEnd: 1 }); // Expiry checks

export const Subscription_Model = model<ISubscription>('subscription', subscriptionSchema);
