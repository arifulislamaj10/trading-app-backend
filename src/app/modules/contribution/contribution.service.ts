import {
  Contribution_Model,
  CONTRIBUTION_POINTS,
  ContributionActivityType,
} from "./contribution.schema";
import { Account_Model } from "../auth/auth.schema";
import { Types } from "mongoose";

export type TimeframeType = "week" | "month" | "all";

const MAX_PAGINATION_LIMIT = 100;
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
 * Track a user contribution activity
 * Non-blocking to avoid slowing down main operations
 */
const track_contribution = async (
  accountId: string,
  activityType: ContributionActivityType,
  activityId?: string,
): Promise<void> => {
  try {
    const points = CONTRIBUTION_POINTS[activityType];

    await Contribution_Model.create({
      accountId: new Types.ObjectId(accountId),
      activityType,
      activityId: activityId ? new Types.ObjectId(activityId) : undefined,
      points,
    });
  } catch (error) {
    // Log error but don't block the main operation
    console.error(`Failed to track contribution: ${error}`);
  }
};

/**
 * Get top contributors ranked by total points
 */
const get_top_contributors = async (
  timeframe: TimeframeType = "week",
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT,
) => {
  const { startDate, endDate } = getDateRange(timeframe);
  const skip = (page - 1) * limit;

  // Aggregate contributions by account
  const aggregation = await Contribution_Model.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$accountId",
        totalPoints: { $sum: "$points" },
        activityCount: { $sum: 1 },
        lastActivity: { $max: "$createdAt" },
        activities: { $push: "$activityType" },
      },
    },
    { $sort: { totalPoints: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "accounts",
        localField: "_id",
        foreignField: "_id",
        as: "account",
      },
    },
    { $unwind: "$account" },
    {
      $project: {
        accountId: "$_id",
        name: "$account.name",
        userProfileUrl: "$account.userProfileUrl",
        role: "$account.role",
        totalPoints: 1,
        activityCount: 1,
        lastActivity: 1,
        activities: 1,
      },
    },
  ]);

  // Determine contribution type badge based on activity breakdown
  const enrichWithBadge = (item: any) => {
    const activityCounts: Record<string, number> = {};
    item.activities.forEach((a: string) => {
      activityCounts[a] = (activityCounts[a] || 0) + 1;
    });

    // Find the most frequent activity type
    let topActivity = "";
    let maxCount = 0;
    for (const [activity, count] of Object.entries(activityCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topActivity = activity;
      }
    }

    // Map to badge labels
    const badgeMap: Record<string, string> = {
      like_signal: "Engaged",
      view_signal: "Engaged",
      comment: "Communicator",
      share_signal: "Top Sharer",
      create_signal: "Top Creator",
      close_signal_profit: "Top Trader",
      bookmark_signal: "Curator",
    };

    return {
      ...item,
      contributionType: badgeMap[topActivity] || "Contributor",
      badgeName: badgeMap[topActivity] || "Contributor",
    };
  };

  const data = aggregation.map(enrichWithBadge);

  // Get total count for pagination
  const totalAggregation = await Contribution_Model.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$accountId",
      },
    },
    {
      $count: "total",
    },
  ]);

  const total = totalAggregation.length > 0 ? totalAggregation[0].total : 0;

  return {
    data,
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
 * Get user's own contribution summary
 */
const get_my_contributions = async (
  accountId: string,
  timeframe: TimeframeType = "week",
) => {
  const { startDate, endDate } = getDateRange(timeframe);

  const aggregation = await Contribution_Model.aggregate([
    {
      $match: {
        accountId: new Types.ObjectId(accountId),
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$accountId",
        totalPoints: { $sum: "$points" },
        activityCount: { $sum: 1 },
        lastActivity: { $max: "$createdAt" },
        breakdown: {
          $push: {
            activityType: "$activityType",
            points: "$points",
            createdAt: "$createdAt",
          },
        },
      },
    },
  ]);

  if (aggregation.length === 0) {
    return {
      totalPoints: 0,
      activityCount: 0,
      lastActivity: null,
      breakdown: [],
      rank: null,
      timeframe,
    };
  }

  // Calculate user's rank among all contributors in the timeframe
  const allContributors = await Contribution_Model.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$accountId",
        totalPoints: { $sum: "$points" },
      },
    },
    { $sort: { totalPoints: -1 } },
  ]);

  const userRank =
    allContributors.findIndex((c) => c._id.toString() === accountId) + 1;

  const result = aggregation[0];

  return {
    totalPoints: result.totalPoints,
    activityCount: result.activityCount,
    lastActivity: result.lastActivity,
    breakdown: result.breakdown,
    rank: userRank > 0 ? userRank : null,
    timeframe,
  };
};

/**
 * Get contribution stats for a specific user
 */
const get_user_contribution_stats = async (accountId: string) => {
  const allTime = await Contribution_Model.aggregate([
    { $match: { accountId: new Types.ObjectId(accountId) } },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: "$points" },
        activityCount: { $sum: 1 },
        byType: {
          $push: {
            activityType: "$activityType",
            count: 1,
            points: "$points",
          },
        },
      },
    },
  ]);

  if (allTime.length === 0) {
    return {
      totalPoints: 0,
      activityCount: 0,
      byType: {},
    };
  }

  // Aggregate by type
  const byType: Record<string, { count: number; points: number }> = {};
  allTime[0].byType.forEach((item: any) => {
    if (!byType[item.activityType]) {
      byType[item.activityType] = { count: 0, points: 0 };
    }
    byType[item.activityType].count += item.count;
    byType[item.activityType].points += item.points;
  });

  return {
    totalPoints: allTime[0].totalPoints,
    activityCount: allTime[0].activityCount,
    byType,
  };
};

export const contribution_services = {
  track_contribution,
  get_top_contributors,
  get_my_contributions,
  get_user_contribution_stats,
};
