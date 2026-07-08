import { z } from "zod";

const tierRewardSchema = z.object({
  free: z.number().min(0).optional(),
  basic: z.number().min(0).optional(),
  pro: z.number().min(0).optional(),
  master: z.number().min(0).optional(),
});

const update_referral_reward = z.object({
  amount: z.coerce.number().min(0, "Amount must be at least 0"),
});

const update_referral_rewards_by_tier = z.object({
  rewards: tierRewardSchema,
  fallbackAmount: z.coerce.number().min(0, "Fallback amount must be at least 0").optional(),
});

const update_referral_campaign_goal = z.object({
  goal: z.number().min(1, "Goal must be at least 1"),
});

export const system_config_validations = {
  update_referral_reward,
  update_referral_rewards_by_tier,
  update_referral_campaign_goal,
};
