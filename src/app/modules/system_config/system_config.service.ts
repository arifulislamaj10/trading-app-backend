import { SystemConfig_Model } from "./system_config.schema";
import {
  IReferralRewardsByTier,
  ISystemConfig,
  ISubscriptionTierInfo,
  SubscriptionTierKey,
} from "./system_config.interface";
import {
  SUBSCRIPTION_TIER_ORDER,
  SubscriptionPlan_Model,
} from "../subscription/subscription.plans";

const DEFAULT_TIER_REWARDS: IReferralRewardsByTier = {
  free: 0,
  basic: 3,
  pro: 5,
  master: 10,
};

const get_subscription_tiers_from_db = async (): Promise<ISubscriptionTierInfo[]> => {
  const plans = await SubscriptionPlan_Model.find({ isActive: true }).sort({
    price: 1,
    name: 1,
  });

  const tierMap = new Map<string, ISubscriptionTierInfo>();

  for (const plan of plans) {
    const tier = (plan.tier || "free").toLowerCase() as SubscriptionTierKey;
    if (!tierMap.has(tier)) {
      tierMap.set(tier, {
        tier,
        label: tier.charAt(0).toUpperCase() + tier.slice(1),
        plans: [],
      });
    }

    tierMap.get(tier)!.plans.push({
      planId: plan.planId,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
      trialDays: plan.trialDays ?? 0,
      affiliateBonusPercent: plan.affiliateBonusPercent ?? 0,
    });
  }

  if (!tierMap.has("free")) {
    tierMap.set("free", {
      tier: "free",
      label: "Free",
      plans: [
        {
          planId: "free",
          name: "Free Plan",
          price: 0,
          interval: "month",
        },
      ],
    });
  }

  return SUBSCRIPTION_TIER_ORDER.filter((tier) => tierMap.has(tier)).map(
    (tier) => tierMap.get(tier)!,
  );
};

const normalize_tier_rewards = (
  rewards: unknown,
): Partial<IReferralRewardsByTier> => {
  if (!rewards || typeof rewards !== "object") return {};
  if (typeof (rewards as { toObject?: () => object }).toObject === "function") {
    return (rewards as { toObject: () => object }).toObject() as Partial<IReferralRewardsByTier>;
  }
  return rewards as Partial<IReferralRewardsByTier>;
};

const sync_tier_rewards_with_plans = async (
  config: ISystemConfig | null,
): Promise<IReferralRewardsByTier> => {
  if (!config) return DEFAULT_TIER_REWARDS;

  const tiers = await get_subscription_tiers_from_db();
  const existing = normalize_tier_rewards(config.referralRewardsByTier);

  const merged: IReferralRewardsByTier = { ...DEFAULT_TIER_REWARDS };

  for (const { tier } of tiers) {
    const key = tier as SubscriptionTierKey;
    merged[key] =
      typeof existing[key] === "number"
        ? existing[key]
        : (DEFAULT_TIER_REWARDS[key] ?? 0);
  }

  const hasChanges = SUBSCRIPTION_TIER_ORDER.some(
    (tier) => merged[tier] !== existing[tier],
  );

  if (hasChanges || !config.referralRewardsByTier) {
    config.referralRewardsByTier = merged;
    await config.save();
  }

  return merged;
};

const get_config = async () => {
  let config = await SystemConfig_Model.findOne();
  if (!config) {
    config = await SystemConfig_Model.create({
      referralRewardAmount: 5,
      referralRewardsByTier: DEFAULT_TIER_REWARDS,
      referralCampaignGoal: 1000,
    });
  }

  await sync_tier_rewards_with_plans(config);
  return config;
};

const get_config_with_tiers = async () => {
  const config = await get_config();
  const subscriptionTiers = await get_subscription_tiers_from_db();

  return {
    ...(config.toObject?.() ?? config),
    referralRewardsByTier: config.referralRewardsByTier,
    subscriptionTiers,
  };
};

const get_referral_reward_for_tier = async (
  tier?: string | null,
): Promise<number> => {
  const config = await get_config();
  const normalized = (tier || "free").toLowerCase() as SubscriptionTierKey;
  const tierRewards = config.referralRewardsByTier || DEFAULT_TIER_REWARDS;
  return tierRewards[normalized] ?? config.referralRewardAmount ?? 5;
};

const update_referral_reward = async (amount: number, adminId: string) => {
  let config = await SystemConfig_Model.findOne();
  if (!config) {
    config = await SystemConfig_Model.create({
      referralRewardAmount: amount,
      referralRewardsByTier: DEFAULT_TIER_REWARDS,
      referralCampaignGoal: 1000,
      updatedBy: adminId,
    });
  } else {
    config.referralRewardAmount = amount;
    config.updatedBy = adminId;
    await config.save();
  }

  await sync_tier_rewards_with_plans(config);
  return get_config_with_tiers();
};

const update_referral_rewards_by_tier = async (
  rewards: Partial<IReferralRewardsByTier>,
  adminId: string,
  fallbackAmount?: number,
) => {
  const config = await get_config();
  const tiers = await get_subscription_tiers_from_db();
  const current = normalize_tier_rewards(config.referralRewardsByTier);

  const nextRewards: IReferralRewardsByTier = { ...DEFAULT_TIER_REWARDS };

  for (const { tier } of tiers) {
    const key = tier as SubscriptionTierKey;
    nextRewards[key] =
      typeof rewards[key] === "number" ? rewards[key]! : (current[key] ?? 0);
  }

  config.referralRewardsByTier = nextRewards;
  if (typeof fallbackAmount === "number") {
    config.referralRewardAmount = fallbackAmount;
  }
  config.updatedBy = adminId;
  await config.save();

  return get_config_with_tiers();
};

const update_referral_campaign_goal = async (goal: number, adminId: string) => {
  const config = await get_config();
  config.referralCampaignGoal = goal;
  config.updatedBy = adminId;
  await config.save();
  return get_config_with_tiers();
};

const update_platforms = async (platforms: Array<{ value: string; label: string }>, adminId: string) => {
  const config = await get_config();
  config.platforms = platforms;
  config.updatedBy = adminId;
  await config.save();
  return config;
};

const get_platforms = async () => {
  const config = await get_config();
  return config.platforms && config.platforms.length > 0
    ? config.platforms
    : [
        { value: "binance", label: "Binance" },
        { value: "mt4", label: "MT4" },
        { value: "mt5", label: "MT5" },
        { value: "bybit", label: "Bybit" },
      ];
};

export const system_config_services = {
  get_config,
  get_config_with_tiers,
  get_subscription_tiers_from_db,
  get_referral_reward_for_tier,
  update_referral_reward,
  update_referral_rewards_by_tier,
  update_referral_campaign_goal,
  update_platforms,
  get_platforms,
};
