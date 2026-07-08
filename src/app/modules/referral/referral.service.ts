import { Referral_Model } from "./referral.schema";
import { Account_Model } from "../auth/auth.schema";
import { WalletTransaction_Model } from "../wallet_transaction/wallet_transaction.schema";
import { AppError } from "../../utils/app_error";
import httpStatus from "http-status";
import { Types } from "mongoose";
import crypto from "crypto";
import { system_config_services } from "../system_config/system_config.service";
import { configs } from "../../configs";

/**
 * Generate a unique referral code
 */
const generateReferralCode = async (): Promise<string> => {
  let isUnique = false;
  let code = "";
  while (!isUnique) {
    code = crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 character hex string
    const existing = await Account_Model.findOne({ referralCode: code });
    if (!existing) isUnique = true;
  }
  return code;
};

const get_badge_by_referral_count = (count: number): string => {
  if (count > 50) return "Platinum";
  if (count > 30) return "Gold";
  if (count > 15) return "Silver";
  if (count > 5) return "Bronze";
  return "Rookie";
};

const get_referral_stats_from_db = async (userId: string) => {
  let account = await Account_Model.findById(userId);
  if (!account) {
    throw new AppError("Account not found", httpStatus.NOT_FOUND);
  }

  // If account doesn't have a referral code, generate one on the fly
  if (!account.referralCode) {
    const newCode = await generateReferralCode();
    account = await Account_Model.findByIdAndUpdate(
      userId,
      { referralCode: newCode },
      { new: true },
    );
  }

  const totalReferrals = await Referral_Model.countDocuments({
    referrerId: userId,
  });
  const activeReferrals = await Referral_Model.countDocuments({
    referrerId: userId,
    status: "COMPLETED",
  });

  // Calculate badge based on active referrals
  const badge = get_badge_by_referral_count(activeReferrals);

  const referrals = await Referral_Model.find({ referrerId: userId });
  const totalRewards = referrals.reduce(
    (sum, ref) => sum + (ref.rewardAmount || 0),
    0,
  );

  const config = await system_config_services.get_config();
  const subscriptionTiers =
    await system_config_services.get_subscription_tiers_from_db();

  // Personal conversion rate (completed / total referrals)
  const conversionRate =
    totalReferrals > 0
      ? Math.round((activeReferrals / totalReferrals) * 10000) / 100
      : 0;

  // Personal monthly growth (completed this month vs last month)
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonthCompleted, lastMonthCompleted, globalCompleted] =
    await Promise.all([
      Referral_Model.countDocuments({
        referrerId: userId,
        status: "COMPLETED",
        completedAt: { $gte: startOfThisMonth },
      }),
      Referral_Model.countDocuments({
        referrerId: userId,
        status: "COMPLETED",
        completedAt: { $gte: startOfLastMonth, $lt: startOfThisMonth },
      }),
      Referral_Model.countDocuments({ status: "COMPLETED" }),
    ]);

  const monthlyGrowthPercent =
    lastMonthCompleted > 0
      ? Math.round(
          ((thisMonthCompleted - lastMonthCompleted) / lastMonthCompleted) *
            10000,
        ) / 100
      : thisMonthCompleted > 0
        ? 100
        : 0;

  // Platform-wide campaign progress (shared goal across all users)
  const campaignGoal = config.referralCampaignGoal || 1000;
  const progressPercent = Math.min(
    100,
    Math.round((globalCompleted / campaignGoal) * 10000) / 100,
  );

  // Base URL from config
  const baseUrl = configs.jwt.front_end_url || process.env.FRONTEND_URL || "http://localhost:3000";
  const referralLink = `${baseUrl}/login?ref=${account!.referralCode}`;

  return {
    referralCode: account!.referralCode,
    referralCodeChanged: account!.referralCodeChanged || false,
    totalReferrals,
    activeReferrals,
    badge,
    totalRewards,
    walletBalance: account!.walletBalance,
    referralLink,
    referralRewardsByTier: config.referralRewardsByTier,
    subscriptionTiers,
    conversionRate,
    campaignPerformance: {
      goal: campaignGoal,
      completed: globalCompleted,
      progressPercent,
      thisMonthCompleted,
      lastMonthCompleted,
      monthlyGrowthPercent,
    },
  };
};

const get_referral_history_from_db = async (userId: string, query: any) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const referrals = await Referral_Model.find({ referrerId: userId })
    .populate("inviteeId", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Referral_Model.countDocuments({ referrerId: userId });

  const data = referrals.map((ref) => ({
    _id: ref._id,
    inviteeName: (ref.inviteeId as any)?.name || "Unknown User",
    status: ref.status,
    rewardAmount: ref.rewardAmount,
    inviteeSubscriptionTier: ref.inviteeSubscriptionTier,
    completedAt: ref.completedAt,
    createdAt: ref.createdAt,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Mark a referral as completed when the invitee subscribes
 */
const complete_referral_in_db = async (inviteeId: string) => {
  const referral = await Referral_Model.findOne({
    inviteeId,
    status: "PENDING",
  });

  if (referral) {
    const invitee = await Account_Model.findById(inviteeId);
    const inviteeTier = invitee?.subscriptionTier || "free";

    const REWARD_AMOUNT = await system_config_services.get_referral_reward_for_tier(
      inviteeTier
    );

    console.log(`[Referral] Completing referral for invitee: ${inviteeId}`);
    console.log(`[Referral] Invitee tier: ${inviteeTier}, Reward Amount: $${REWARD_AMOUNT}`);

    const referrerAccount = await Account_Model.findById(referral.referrerId);
    console.log(`[Referral] Referrer Wallet Balance Before: $${referrerAccount?.walletBalance || 0}`);

    await Referral_Model.findByIdAndUpdate(referral._id, {
      status: "COMPLETED",
      rewardAmount: REWARD_AMOUNT,
      inviteeSubscriptionTier: inviteeTier,
      completedAt: new Date(),
    });

    if (REWARD_AMOUNT > 0) {
      const updatedAccount = await Account_Model.findByIdAndUpdate(
        referral.referrerId,
        { $inc: { walletBalance: REWARD_AMOUNT } },
        { new: true }
      );

      console.log(`[Referral] Referrer Wallet Balance After: $${updatedAccount?.walletBalance || 0}`);

      await WalletTransaction_Model.create({
        userId: referral.referrerId,
        amount: REWARD_AMOUNT,
        type: "REWARD",
        status: "COMPLETED",
        referenceId: referral._id,
        description: `Referral reward (${inviteeTier} tier)`,
      });
    }

    return true;
  }

  return false;
};

export const referral_services = {
  get_referral_stats_from_db,
  get_referral_history_from_db,
  complete_referral_in_db,
  generateReferralCode,
  get_badge_by_referral_count,
};

