import { Request, Response } from "express";
import catch_async from "../../utils/catch_async";
import { system_config_services } from "./system_config.service";
import httpStatus from "http-status";

const get_config = catch_async(async (req: Request, res: Response) => {
  const result = await system_config_services.get_config_with_tiers();

  res.status(httpStatus.OK).json({
    success: true,
    message: "System configuration fetched successfully",
    data: result,
  });
});

const update_referral_reward = catch_async(async (req: Request, res: Response) => {
  const { amount } = req.body;
  const adminId = (req.user as any)?.userId;

  const result = await system_config_services.update_referral_reward(amount, adminId);

  res.status(httpStatus.OK).json({
    success: true,
    message: "Referral reward amount updated successfully",
    data: result,
  });
});

const update_referral_rewards_by_tier = catch_async(async (req: Request, res: Response) => {
  const { rewards, fallbackAmount } = req.body;
  const adminId = (req.user as any)?.userId;

  const result = await system_config_services.update_referral_rewards_by_tier(
    rewards,
    adminId,
    fallbackAmount,
  );

  res.status(httpStatus.OK).json({
    success: true,
    message: "Tier-based referral rewards updated successfully",
    data: result,
  });
});

const update_referral_campaign_goal = catch_async(async (req: Request, res: Response) => {
  const { goal } = req.body;
  const adminId = (req.user as any)?.userId;

  const result = await system_config_services.update_referral_campaign_goal(goal, adminId);

  res.status(httpStatus.OK).json({
    success: true,
    message: "Referral campaign goal updated successfully",
    data: result,
  });
});

export const system_config_controllers = {
  get_config,
  update_referral_reward,
  update_referral_rewards_by_tier,
  update_referral_campaign_goal,
};
