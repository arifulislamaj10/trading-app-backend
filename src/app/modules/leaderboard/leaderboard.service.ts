import { Master_Model } from "../master/master.schema";
import { Signal_Model } from "../signal/signal.schema";
import { AppError } from "../../utils/app_error";
import httpStatus from "http-status";
import { Types } from "mongoose";
import { referral_services } from "../referral/referral.service";
import { Referral_Model } from "../referral/referral.schema";

export type TimeframeType = "week" | "month" | "all";

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
 * Calculate composite leaderboard score for a master
 * Weights: 40% win rate, 30% avg PnL, 20% followers, 10% activity
 */
interface NormalizedMetrics {
  winRate: number;
  avgPnl: number;
  followerCount: number;
  totalSignals: number;
}

/**
 * Calculate normalized metrics for scoring
 * Normalizes values to 0-1 range based on max values in the dataset
 */
const normalizeMetrics = (
  metrics: NormalizedMetrics,
  maxMetrics: NormalizedMetrics,
): number => {
  const winRateScore =
    maxMetrics.winRate > 0 ? metrics.winRate / maxMetrics.winRate : 0;
  const avgPnlScore =
    maxMetrics.avgPnl > 0 ? metrics.avgPnl / maxMetrics.avgPnl : 0;
  const followerScore =
    maxMetrics.followerCount > 0
      ? metrics.followerCount / maxMetrics.followerCount
      : 0;
  const signalScore =
    maxMetrics.totalSignals > 0
      ? metrics.totalSignals / maxMetrics.totalSignals
      : 0;

  return (
    winRateScore * 0.4 + // 40% weight on win rate
    avgPnlScore * 0.3 + // 30% weight on profitability
    followerScore * 0.2 + // 20% weight on community trust
    signalScore * 0.1 // 10% weight on activity
  );
};

/**
 * Get leaderboard with ranked Master Traders
 * Uses composite scoring based on performance metrics
 * Stats (totalMasters, avgWinRate, totalSignals, totalFollowers) are embedded in the response
 */
const get_leaderboard = async (
  timeframe: TimeframeType = "all",
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT,
) => {
  const { startDate } = getDateRange(timeframe);
  const skip = (page - 1) * limit;

  // Get all masters
  const masters = await Master_Model.find()
    .populate("accountId", "name email userProfileUrl")
    .sort({ followerCount: -1, winRate: -1 })
    .skip(skip)
    .limit(limit);

  // Get total count and stats in parallel
  const [total, allMastersForNormalization] = await Promise.all([
    Master_Model.countDocuments(),
    Master_Model.find(),
  ]);

  if (masters.length === 0) {
    return {
      data: [],
      topThree: [],
      rest: [],
      stats: {
        totalMasters: 0,
        avgWinRate: 0,
        totalSignals: 0,
        totalFollowers: 0,
      },
      meta: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        timeframe,
      },
    };
  }

  // Get max metrics for normalization
  const maxMetrics: NormalizedMetrics = {
    winRate: Math.max(...allMastersForNormalization.map((m) => m.winRate), 1),
    avgPnl: Math.max(
      ...allMastersForNormalization.map((m) => Math.abs(m.avgPnl)),
      1,
    ),
    followerCount: Math.max(
      ...allMastersForNormalization.map((m) => m.followerCount),
      1,
    ),
    totalSignals: Math.max(
      ...allMastersForNormalization.map((m) => m.totalSignals),
      1,
    ),
  };

  // Calculate scores and enrich with rank
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

  const scoredMasters = masters.map((master) => {
    const metrics: NormalizedMetrics = {
      winRate: master.winRate,
      avgPnl: Math.abs(master.avgPnl),
      followerCount: master.followerCount,
      totalSignals: master.totalSignals,
    };

    const score = normalizeMetrics(metrics, maxMetrics);
    const accountId = master.accountId._id.toString();

    return {
      _id: master._id,
      accountId: master.accountId,
      bio: master.bio,
      specialties: master.specialties,
      winRate: master.winRate,
      avgPnl: master.avgPnl,
      followerCount: master.followerCount,
      totalSignals: master.totalSignals,
      isFeatured: master.isFeatured,
      leaderboardScore: Math.round(score * 10000) / 100, // 0-100 scale
      badgeName: referralBadgeMap[accountId] || "Rookie",
    };
  });

  // Sort by leaderboard score
  scoredMasters.sort((a, b) => b.leaderboardScore - a.leaderboardScore);

  // Separate top 3 for highlight display
  const topThree = scoredMasters.slice(0, 3);
  const rest = scoredMasters.slice(3);

  // Calculate stats
  const totalSignals = allMastersForNormalization.reduce(
    (sum, m) => sum + m.totalSignals,
    0,
  );
  const totalFollowers = allMastersForNormalization.reduce(
    (sum, m) => sum + m.followerCount,
    0,
  );
  const avgWinRate =
    allMastersForNormalization.reduce((sum, m) => sum + m.winRate, 0) /
    allMastersForNormalization.length;

  return {
    data: scoredMasters,
    topThree,
    rest,
    stats: {
      totalMasters: allMastersForNormalization.length,
      avgWinRate: Math.round(avgWinRate * 100) / 100,
      totalSignals,
      totalFollowers,
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      timeframe,
    },
  };
};

/**
 * Get a specific user's rank on the leaderboard
 */
const get_user_rank = async (accountId: string) => {
  const master = await Master_Model.findOne({
    accountId: new Types.ObjectId(accountId),
  });

  if (!master) {
    throw new AppError("Master profile not found", httpStatus.NOT_FOUND);
  }

  // Get all masters to calculate rank
  const allMasters = await Master_Model.find();

  // Get max metrics for normalization
  const maxMetrics: NormalizedMetrics = {
    winRate: Math.max(...allMasters.map((m) => m.winRate), 1),
    avgPnl: Math.max(...allMasters.map((m) => Math.abs(m.avgPnl)), 1),
    followerCount: Math.max(...allMasters.map((m) => m.followerCount), 1),
    totalSignals: Math.max(...allMasters.map((m) => m.totalSignals), 1),
  };

  // Calculate scores for all masters
  const scoredMasters = allMasters.map((m) => {
    const metrics: NormalizedMetrics = {
      winRate: m.winRate,
      avgPnl: Math.abs(m.avgPnl),
      followerCount: m.followerCount,
      totalSignals: m.totalSignals,
    };

    return {
      accountId: m.accountId.toString(),
      score: normalizeMetrics(metrics, maxMetrics),
    };
  });

  // Sort by score descending
  scoredMasters.sort((a, b) => b.score - a.score);

  // Find user's rank (1-indexed)
  const rank = scoredMasters.findIndex((m) => m.accountId === accountId) + 1;

  const userScore = scoredMasters.find((m) => m.accountId === accountId);

  // Get referral badge
  const activeReferrals = await Referral_Model.countDocuments({
    referrerId: new Types.ObjectId(accountId),
    status: "COMPLETED",
  });
  const badgeName =
    referral_services.get_badge_by_referral_count(activeReferrals);

  return {
    rank,
    score: userScore ? Math.round(userScore.score * 10000) / 100 : 0,
    totalMasters: allMasters.length,
    masterProfile: {
      winRate: master.winRate,
      avgPnl: master.avgPnl,
      followerCount: master.followerCount,
      totalSignals: master.totalSignals,
      badgeName,
    },
  };
};

export const leaderboard_services = {
  get_leaderboard,
  get_user_rank,
};
