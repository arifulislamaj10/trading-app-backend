import { model, Schema } from "mongoose";

export interface ISubscriptionPlan {
  planId: string;
  name: string;
  description: string;
  price: number; // In dollars
  currency: string;
  interval: "month" | "year";
  stripeProductId?: string;
  stripePriceId?: string;
  features: string[];
  signalLimit: number; // -1 for unlimited
  mediaAccess: boolean;
  prioritySupport: boolean;
  isActive: boolean;
  durationInDays?: number;
  tier: "free" | "basic" | "pro" | "master";
  trialDays: number;
  affiliateBonusPercent?: number;
  syncedToStripe: boolean;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    planId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    interval: { type: String, enum: ["month", "year"], default: "month" },
    stripeProductId: { type: String },
    stripePriceId: { type: String },
    features: { type: [String], required: true },
    signalLimit: { type: Number, default: -1 },
    mediaAccess: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    durationInDays: { type: Number },
    tier: {
      type: String,
      enum: ["free", "basic", "pro", "master"],
      default: "pro",
    },
    trialDays: { type: Number, default: 0, min: 0 },
    affiliateBonusPercent: { type: Number, default: 0, min: 0 },
    syncedToStripe: { type: Boolean, default: false },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

subscriptionPlanSchema.index({ planId: 1 }, { unique: true });
subscriptionPlanSchema.index({ isActive: 1 });
subscriptionPlanSchema.index({ tier: 1 });
subscriptionPlanSchema.index({ syncedToStripe: 1 });

export const SubscriptionPlan_Model = model<ISubscriptionPlan>(
  "subscriptionPlan",
  subscriptionPlanSchema,
);

export const SUBSCRIPTION_TIER_ORDER = [
  "free",
  "basic",
  "pro",
  "master",
] as const;
export type SubscriptionTierName = (typeof SUBSCRIPTION_TIER_ORDER)[number];

const SHARED_FEATURES = [
  "Over 300 Copilot uses per day",
  "Unlock more trades",
  "Pro support from our team",
  "Early access to new features",
];

// Only two real subscription plans for the product
export const DEFAULT_PLANS: Omit<ISubscriptionPlan, "_id">[] = [
  {
    planId: "monthly",
    name: "Monthly",
    description: "Unlock buy/sell signals and trade history. Billed monthly.",
    price: 49,
    currency: "usd",
    interval: "month",
    stripePriceId: "price_monthly",
    features: SHARED_FEATURES,
    signalLimit: -1,
    mediaAccess: true,
    prioritySupport: true,
    isActive: true,
    tier: "pro",
    trialDays: 0,
    affiliateBonusPercent: 50,
    syncedToStripe: false,
  },
  {
    planId: "yearly",
    name: "Yearly",
    description: "Unlock buy/sell signals and trade history. Billed yearly.",
    price: 500,
    currency: "usd",
    interval: "year",
    stripePriceId: "price_yearly",
    features: SHARED_FEATURES,
    signalLimit: -1,
    mediaAccess: true,
    prioritySupport: true,
    isActive: true,
    tier: "pro",
    trialDays: 7,
    affiliateBonusPercent: 0,
    syncedToStripe: false,
  },
];

export const getYearlySavings = (monthlyPrice = 49, yearlyPrice = 500) =>
  Math.max(0, monthlyPrice * 12 - yearlyPrice);

/** Maps legacy plan IDs (e.g. pro_yearly) to current plan IDs (yearly). */
export const LEGACY_PLAN_ID_MAP: Record<string, string> = {
  pro_yearly: "yearly",
  pro_monthly: "monthly",
  basic_monthly: "monthly",
  basic_yearly: "yearly",
  master_monthly: "monthly",
  master_yearly: "yearly",
  free: "free",
};

export function normalizePlanId(
  planId: string,
  knownPlanIds?: Set<string> | Record<string, unknown>,
): string {
  if (!planId) return "free";

  if (knownPlanIds) {
    const isKnown =
      knownPlanIds instanceof Set
        ? knownPlanIds.has(planId)
        : planId in knownPlanIds;
    if (isKnown) return planId;
  }

  if (LEGACY_PLAN_ID_MAP[planId]) return LEGACY_PLAN_ID_MAP[planId];
  if (planId.endsWith("_yearly")) return "yearly";
  if (planId.endsWith("_monthly")) return "monthly";

  return planId;
}

export function resolvePlanName(
  planId: string,
  planNameMap: Record<string, string>,
  knownPlanIds?: Set<string>,
): string {
  const normalized = normalizePlanId(planId, knownPlanIds ?? planNameMap);
  return planNameMap[normalized] || planNameMap[planId] || normalized;
}
