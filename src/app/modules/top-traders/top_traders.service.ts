import { Master_Model } from "../master/master.schema";
import { Signal_Model } from "../signal/signal.schema";
import { Follow_Model } from "../follow/follow.schema";
import { Types } from "mongoose";
import { referral_services } from "../referral/referral.service";
import { Referral_Model } from "../referral/referral.schema";

export type TimeframeType = "week" | "month" | "all";
export type SortByType =
  | "winRate"
  | "avgPnl"
  | "totalSignals"
  | "followerCount";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

/**
 * Get date range based on timeframe
 */
const getDateRange = (
  timeframe: TimeframeType,
): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const endDate = new Date(now);

  let startDate: Date;
  switch (timeframe) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "all":
    default:
      startDate = new Date(0);
      break;
  }

  return { startDate, endDate };
};

/**
 * Get top traders ranked by win rate (primary metric for trading performance)
 * Supports `limit` param — use limit=3 for top-3 widget, default=10 for full list
 */
const get_top_traders = async (
  timeframe: TimeframeType = "all",
  sortBy: SortByType = "winRate",
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT,
  currentUserId?: string,
) => {
  const { startDate } = getDateRange(timeframe);
  const skip = (page - 1) * limit;

  // Build sort object based on sortBy parameter
  const sortOptions: Record<string, -1 | 1> = { [sortBy]: -1 };
  // Secondary sort by followerCount for tie-breaking
  sortOptions["followerCount"] = -1;

  // Get all masters
  const masters = await Master_Model.find()
    .populate("accountId", "name email userProfileUrl")
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  const total = await Master_Model.countDocuments();

  // If user is logged in, check which masters they follow in one go
  let followedMasterIds: Set<string> = new Set();
  if (currentUserId) {
    const follows = await Follow_Model.find({
      followerId: new Types.ObjectId(currentUserId),
      masterId: { $in: masters.map((m) => m.accountId) },
    }).select("masterId");
    followedMasterIds = new Set(follows.map((f) => f.masterId.toString()));
  }

  // Get referral badges for all masters in the list
  const masterAccountIds = masters.map((m) => m.accountId._id);
  const referralCounts = await Referral_Model.aggregate([
    { $match: { referrerId: { $in: masterAccountIds }, status: "COMPLETED" } },
    { $group: { _id: "$referrerId", count: { $sum: 1 } } },
  ]);

  const referralBadgeMap: Record<string, string> = {};
  referralCounts.forEach((rc) => {
    referralBadgeMap[rc._id.toString()] =
      referral_services.get_badge_by_referral_count(rc.count);
  });

  // Enrich with recent signal performance for context
  const enrichedMasters = await Promise.all(
    masters.map(async (master) => {
      // Get recent signals count for activity context
      const recentSignalsCount = await Signal_Model.countDocuments({
        authorId: master.accountId,
        status: "completed",
        closedAt: { $gte: startDate },
      });

      const accountId = master.accountId._id.toString();

      return {
        _id: master._id,
        accountId: master.accountId,
        name: (master.accountId as any)?.name || "",
        userProfileUrl: (master.accountId as any)?.userProfileUrl || "",
        bio: master.bio,
        specialties: master.specialties,
        winRate: master.winRate,
        avgPnl: master.avgPnl,
        totalSignals: master.totalSignals,
        winningSignals: master.winningSignals,
        losingSignals: master.losingSignals,
        followerCount: master.followerCount,
        isFeatured: master.isFeatured,
        isFollow: currentUserId
          ? followedMasterIds.has(master.accountId.toString())
          : false,
        recentSignalsCount,
        rank: skip + masters.indexOf(master) + 1,
        badgeName: referralBadgeMap[accountId] || "Rookie",
      };
    }),
  );

  return {
    data: enrichedMasters,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      timeframe,
      sortBy,
    },
  };
};

/**
 * Get trader performance details for a specific master
 */
const get_trader_performance = async (
  accountId: string,
  currentUserId?: string,
) => {
  const master = await Master_Model.findOne({
    accountId: new Types.ObjectId(accountId),
  }).populate("accountId", "name email userProfileUrl");

  if (!master) {
    return null;
  }

  // Check if current user is following this master
  let isFollow = false;
  if (currentUserId) {
    const followRecord = await Follow_Model.findOne({
      followerId: new Types.ObjectId(currentUserId),
      masterId: new Types.ObjectId(accountId),
    });
    isFollow = !!followRecord;
  }

  // Get all signals for detailed breakdown
  const signals = await Signal_Model.find({
    authorId: new Types.ObjectId(accountId),
    status: "completed",
  }).sort({ closedAt: -1 });

  const profitableSignals = signals.filter((s) => (s.resultPnl || 0) > 0);
  const losingSignals = signals.filter((s) => (s.resultPnl || 0) < 0);
  const breakevenSignals = signals.filter((s) => (s.resultPnl || 0) === 0);

  const totalPnl = signals.reduce((sum, s) => sum + (s.resultPnl || 0), 0);
  const avgWinAmount =
    profitableSignals.length > 0
      ? profitableSignals.reduce((sum, s) => sum + (s.resultPnl || 0), 0) /
        profitableSignals.length
      : 0;
  const avgLossAmount =
    losingSignals.length > 0
      ? losingSignals.reduce((sum, s) => sum + (s.resultPnl || 0), 0) /
        losingSignals.length
      : 0;

  // Get referral badge
  const activeReferrals = await Referral_Model.countDocuments({
    referrerId: new Types.ObjectId(accountId),
    status: "COMPLETED",
  });
  const badgeName =
    referral_services.get_badge_by_referral_count(activeReferrals);

  return {
    profile: {
      _id: master._id,
      accountId: master.accountId,
      name: (master.accountId as any)?.name || "",
      userProfileUrl: (master.accountId as any)?.userProfileUrl || "",
      bio: master.bio,
      specialties: master.specialties,
      isFollow,
      badgeName,
    },
    performance: {
      winRate: master.winRate,
      avgPnl: master.avgPnl,
      totalSignals: master.totalSignals,
      winningSignals: master.winningSignals,
      losingSignals: master.losingSignals,
      followerCount: master.followerCount,
      totalPnl: Math.round(totalPnl * 100) / 100,
      avgWinAmount: Math.round(avgWinAmount * 100) / 100,
      avgLossAmount: Math.round(avgLossAmount * 100) / 100,
    },
    breakdown: {
      profitableSignals: profitableSignals.length,
      losingSignals: losingSignals.length,
      breakevenSignals: breakevenSignals.length,
    },
    recentSignals: signals.slice(0, 10),
  };
};

/**
 * Compare two traders side by side
 */
const compare_traders = async (accountId1: string, accountId2: string) => {
  const trader1 = await Master_Model.findOne({
    accountId: new Types.ObjectId(accountId1),
  }).populate("accountId", "name email userProfileUrl");

  const trader2 = await Master_Model.findOne({
    accountId: new Types.ObjectId(accountId2),
  }).populate("accountId", "name email userProfileUrl");

  if (!trader1 || !trader2) {
    return null;
  }

  const activeReferrals1 = await Referral_Model.countDocuments({
    referrerId: new Types.ObjectId(accountId1),
    status: "COMPLETED",
  });
  const badgeName1 =
    referral_services.get_badge_by_referral_count(activeReferrals1);

  const activeReferrals2 = await Referral_Model.countDocuments({
    referrerId: new Types.ObjectId(accountId2),
    status: "COMPLETED",
  });
  const badgeName2 =
    referral_services.get_badge_by_referral_count(activeReferrals2);

  return {
    trader1: {
      accountId: trader1.accountId,
      name: (trader1.accountId as any)?.name || "",
      userProfileUrl: (trader1.accountId as any)?.userProfileUrl || "",
      winRate: trader1.winRate,
      avgPnl: trader1.avgPnl,
      totalSignals: trader1.totalSignals,
      winningSignals: trader1.winningSignals,
      losingSignals: trader1.losingSignals,
      followerCount: trader1.followerCount,
      badgeName: badgeName1,
    },
    trader2: {
      accountId: trader2.accountId,
      name: (trader2.accountId as any)?.name || "",
      userProfileUrl: (trader2.accountId as any)?.userProfileUrl || "",
      winRate: trader2.winRate,
      avgPnl: trader2.avgPnl,
      totalSignals: trader2.totalSignals,
      winningSignals: trader2.winningSignals,
      losingSignals: trader2.losingSignals,
      followerCount: trader2.followerCount,
      badgeName: badgeName2,
    },
  };
};

export const top_traders_services = {
  get_top_traders,
  get_trader_performance,
  compare_traders,
};
