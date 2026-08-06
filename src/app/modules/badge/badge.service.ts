import { Types } from "mongoose";
import { AppError } from "../../utils/app_error";
import httpStatus from "http-status";
import { Account_Model } from "../auth/auth.schema";
import { Copied_Trade_Model } from "../copied_trade/copied_trade.schema";
import { Master_Model } from "../master/master.schema";
import { notification_services } from "../notification/notification.service";
import logger from "../../configs/logger";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  BADGE_THRESHOLDS,
  BadgeKey,
  BadgeRole,
  PRO_TIERS,
} from "./badge.constants";
import { Badge_Model, User_Badge_Model } from "./badge.schema";

export interface BadgeProgress {
  current: number;
  target: number;
}

export interface BadgeListItem {
  key: BadgeKey;
  name: string;
  description: string;
  iconKey: string;
  iconUrl: string;
  category: string;
  earned: boolean;
  earnedAt: string | null;
  progress: BadgeProgress | null;
}

const toUtcDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const daysBetweenUtc = (a: string, b: string): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (new Date(`${b}T00:00:00.000Z`).getTime() -
      new Date(`${a}T00:00:00.000Z`).getTime()) /
      msPerDay,
  );
};

const longestConsecutiveDays = (sortedDateKeys: string[]): number => {
  if (sortedDateKeys.length === 0) return 0;
  let max = 1;
  let current = 1;
  for (let i = 1; i < sortedDateKeys.length; i++) {
    if (daysBetweenUtc(sortedDateKeys[i - 1], sortedDateKeys[i]) === 1) {
      current += 1;
    } else {
      current = 1;
    }
    max = Math.max(max, current);
  }
  return max;
};

const getIsoWeekKey = (date: Date): string => {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

interface TradeStats {
  completedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  distinctLogDays: number;
  longestWinDayStreak: number;
  hasPerfectWeek: boolean;
}

const getTradeStats = async (userId: string): Promise<TradeStats> => {
  const trades = await Copied_Trade_Model.find({
    userId: new Types.ObjectId(userId),
    status: "completed",
    loggedAt: { $ne: null },
  }).select("outcome loggedAt");

  const completedTrades = trades.length;
  const wins = trades.filter((t) => t.outcome === "win").length;
  const losses = trades.filter((t) => t.outcome === "loss").length;
  const winRate = completedTrades > 0 ? wins / completedTrades : 0;

  const logDaySet = new Set<string>();
  const winDaySet = new Set<string>();
  const weekBuckets = new Map<
    string,
    { wins: number; losses: number; total: number }
  >();

  for (const trade of trades) {
    if (!trade.loggedAt) continue;
    const dayKey = toUtcDateKey(trade.loggedAt);
    logDaySet.add(dayKey);
    if (trade.outcome === "win") winDaySet.add(dayKey);

    const weekKey = getIsoWeekKey(trade.loggedAt);
    const bucket = weekBuckets.get(weekKey) ?? { wins: 0, losses: 0, total: 0 };
    bucket.total += 1;
    if (trade.outcome === "win") bucket.wins += 1;
    if (trade.outcome === "loss") bucket.losses += 1;
    weekBuckets.set(weekKey, bucket);
  }

  const winDays = [...winDaySet].sort();
  const longestWinDayStreak = longestConsecutiveDays(winDays);

  let hasPerfectWeek = false;
  for (const bucket of weekBuckets.values()) {
    if (
      bucket.total >= BADGE_THRESHOLDS.perfectWeekMinTrades &&
      bucket.losses === 0 &&
      bucket.wins === bucket.total
    ) {
      hasPerfectWeek = true;
      break;
    }
  }

  return {
    completedTrades,
    wins,
    losses,
    winRate,
    distinctLogDays: logDaySet.size,
    longestWinDayStreak,
    hasPerfectWeek,
  };
};

interface NormalizedMetrics {
  winRate: number;
  avgPnl: number;
  followerCount: number;
  totalSignals: number;
}

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
    winRateScore * 0.4 +
    avgPnlScore * 0.3 +
    followerScore * 0.2 +
    signalScore * 0.1
  );
};

const computeMasterRankMap = async (): Promise<Map<string, number>> => {
  const allMasters = await Master_Model.find();
  const rankMap = new Map<string, number>();

  if (allMasters.length === 0) return rankMap;

  const maxMetrics: NormalizedMetrics = {
    winRate: Math.max(...allMasters.map((m) => m.winRate), 1),
    avgPnl: Math.max(...allMasters.map((m) => Math.abs(m.avgPnl)), 1),
    followerCount: Math.max(...allMasters.map((m) => m.followerCount), 1),
    totalSignals: Math.max(...allMasters.map((m) => m.totalSignals), 1),
  };

  const scored = allMasters.map((m) => {
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

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((entry, index) => {
    rankMap.set(entry.accountId, index + 1);
  });

  return rankMap;
};

const resolveBadgeRole = (role: string | undefined): BadgeRole => {
  if (role === "MASTER") return "MASTER";
  return "USER";
};

const award_badge = async (
  accountId: string,
  badgeKey: BadgeKey,
): Promise<boolean> => {
  const existing = await User_Badge_Model.findOne({
    accountId: new Types.ObjectId(accountId),
    badgeKey,
  });
  if (existing) return false;

  const badge = await Badge_Model.findOne({ key: badgeKey, isActive: true });
  if (!badge) return false;

  await User_Badge_Model.create({
    accountId: new Types.ObjectId(accountId),
    badgeKey,
    earnedAt: new Date(),
  });

  await notification_services.create_notification({
    accountId,
    type: "badge_earned",
    title: "Badge unlocked",
    message: `You earned the "${badge.name}" badge!`,
    link: "/badges",
    data: { badgeKey, badgeName: badge.name },
  });

  return true;
};

const checkElitist = async (accountId: string): Promise<boolean> => {
  const account = await Account_Model.findById(accountId).select(
    "subscriptionTier subscriptionStatus",
  );
  if (!account) return false;
  const tier = (account.subscriptionTier || "free").toLowerCase();
  const status = (account.subscriptionStatus || "").toLowerCase();
  return (
    PRO_TIERS.includes(tier as (typeof PRO_TIERS)[number]) &&
    ACTIVE_SUBSCRIPTION_STATUSES.includes(
      status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number],
    )
  );
};

const checkTrainingComplete = async (userId: string): Promise<boolean> => {
  const account = await Account_Model.findById(userId).select(
    "tradingUnlocked trainingCompletedAt",
  );
  return Boolean(account?.tradingUnlocked || account?.trainingCompletedAt);
};

const evaluateUserBadgeKeys = async (
  userId: string,
  earnedKeys: Set<string>,
): Promise<BadgeKey[]> => {
  const newlyEarned: BadgeKey[] = [];
  const stats = await getTradeStats(userId);

  const checks: { key: BadgeKey; met: boolean }[] = [
    { key: "training_complete", met: await checkTrainingComplete(userId) },
    { key: "first_signal", met: stats.completedTrades >= 1 },
    {
      key: "signal_maestro",
      met: stats.completedTrades >= BADGE_THRESHOLDS.signalMaestroTrades,
    },
    {
      key: "ace_trader",
      met:
        stats.completedTrades >= BADGE_THRESHOLDS.aceTraderMinTrades &&
        stats.winRate >= BADGE_THRESHOLDS.aceTraderWinRate,
    },
    {
      key: "consistent",
      met: stats.distinctLogDays >= BADGE_THRESHOLDS.consistentLogDays,
    },
    {
      key: "hot_streak",
      met: stats.longestWinDayStreak >= BADGE_THRESHOLDS.hotStreakDays,
    },
    { key: "perfect_week", met: stats.hasPerfectWeek },
  ];

  if (await checkElitist(userId)) {
    checks.push({ key: "elitist", met: true });
  }

  for (const { key, met } of checks) {
    if (met && !earnedKeys.has(key)) {
      const awarded = await award_badge(userId, key);
      if (awarded) newlyEarned.push(key);
    }
  }

  return newlyEarned;
};

const evaluateMasterBadgeKeys = async (
  accountId: string,
  earnedKeys: Set<string>,
  rankMap?: Map<string, number>,
): Promise<BadgeKey[]> => {
  const newlyEarned: BadgeKey[] = [];
  const master = await Master_Model.findOne({
    accountId: new Types.ObjectId(accountId),
  });
  if (!master) return newlyEarned;

  const ranks = rankMap ?? (await computeMasterRankMap());
  const rank = ranks.get(accountId) ?? 0;

  const checks: { key: BadgeKey; met: boolean }[] = [
    { key: "top_trader", met: rank === 1 },
    {
      key: "rising_star",
      met: rank > 0 && rank <= BADGE_THRESHOLDS.risingStarMaxRank,
    },
  ];

  for (const { key, met } of checks) {
    if (met && !earnedKeys.has(key)) {
      const awarded = await award_badge(accountId, key);
      if (awarded) newlyEarned.push(key);
    }
  }

  return newlyEarned;
};

const getEarnedKeySet = async (accountId: string): Promise<Set<string>> => {
  const earned = await User_Badge_Model.find({
    accountId: new Types.ObjectId(accountId),
  }).select("badgeKey");
  return new Set(earned.map((e) => e.badgeKey));
};

const buildProgress = async (
  badgeKey: BadgeKey,
  userId: string,
  stats?: TradeStats,
): Promise<BadgeProgress | null> => {
  const s = stats ?? (await getTradeStats(userId));

  switch (badgeKey) {
    case "first_signal":
      return { current: Math.min(s.completedTrades, 1), target: 1 };
    case "signal_maestro":
      return {
        current: Math.min(
          s.completedTrades,
          BADGE_THRESHOLDS.signalMaestroTrades,
        ),
        target: BADGE_THRESHOLDS.signalMaestroTrades,
      };
    case "ace_trader":
      return {
        current: Math.min(
          Math.round(s.winRate * 100),
          Math.round(BADGE_THRESHOLDS.aceTraderWinRate * 100),
        ),
        target: Math.round(BADGE_THRESHOLDS.aceTraderWinRate * 100),
      };
    case "consistent":
      return {
        current: Math.min(
          s.distinctLogDays,
          BADGE_THRESHOLDS.consistentLogDays,
        ),
        target: BADGE_THRESHOLDS.consistentLogDays,
      };
    case "hot_streak":
      return {
        current: Math.min(
          s.longestWinDayStreak,
          BADGE_THRESHOLDS.hotStreakDays,
        ),
        target: BADGE_THRESHOLDS.hotStreakDays,
      };
  }
  return null;
};

const get_badges_for_account = async (accountId: string) => {
  const account = await Account_Model.findById(accountId).select("role");
  if (!account) {
    throw new AppError("Account not found", httpStatus.NOT_FOUND);
  }

  const badgeRole = resolveBadgeRole(account.role);
  const [catalog, earnedKeySet] = await Promise.all([
    Badge_Model.find({ role: badgeRole, isActive: true }).sort({
      sortOrder: 1,
    }),
    getEarnedKeySet(accountId),
  ]);

  let tradeStats: TradeStats | undefined;
  if (badgeRole === "USER") {
    tradeStats = await getTradeStats(accountId);
    await evaluateUserBadgeKeys(accountId, earnedKeySet);
  } else if (badgeRole === "MASTER") {
    await evaluateMasterBadgeKeys(accountId, earnedKeySet);
  }

  const refreshedEarned = await User_Badge_Model.find({
    accountId: new Types.ObjectId(accountId),
  });
  const refreshedMap = new Map(
    refreshedEarned.map((e) => [e.badgeKey, e.earnedAt.toISOString()]),
  );

  const badges: BadgeListItem[] = await Promise.all(
    catalog.map(async (badge) => {
      const earned = refreshedMap.has(badge.key);
      return {
        key: badge.key,
        name: badge.name,
        description: badge.description,
        iconKey: badge.iconKey,
        iconUrl: badge.iconUrl,
        category: badge.category,
        earned,
        earnedAt: earned ? (refreshedMap.get(badge.key) ?? null) : null,
        progress:
          !earned && badgeRole === "USER"
            ? await buildProgress(badge.key, accountId, tradeStats)
            : null,
      };
    }),
  );

  return {
    role: badgeRole,
    badges,
    summary: {
      earned: badges.filter((b) => b.earned).length,
      total: badges.length,
    },
  };
};

const get_earned_badges = async (accountId: string) => {
  const account = await Account_Model.findById(accountId).select("role");
  if (!account) {
    throw new AppError("Account not found", httpStatus.NOT_FOUND);
  }

  const badgeRole = resolveBadgeRole(account.role);
  const earned = await User_Badge_Model.find({
    accountId: new Types.ObjectId(accountId),
  }).sort({ earnedAt: -1 });

  const catalog = await Badge_Model.find({
    key: { $in: earned.map((e) => e.badgeKey) },
    role: badgeRole,
  });
  const catalogMap = new Map(catalog.map((b) => [b.key, b]));

  return earned
    .map((e) => {
      const def = catalogMap.get(e.badgeKey);
      if (!def) return null;
      return {
        key: def.key,
        name: def.name,
        description: def.description,
        iconKey: def.iconKey,
        iconUrl: def.iconUrl,
        earnedAt: e.earnedAt.toISOString(),
      };
    })
    .filter(Boolean);
};

const get_badge_summary = async (accountId: string) => {
  const result = await get_badges_for_account(accountId);
  const recentlyEarned = result.badges
    .filter((b) => b.earned && b.earnedAt)
    .sort((a, b) => (b.earnedAt! > a.earnedAt! ? 1 : -1))
    .slice(0, 3)
    .map((b) => ({
      key: b.key,
      name: b.name,
      iconUrl: b.iconUrl,
      earnedAt: b.earnedAt,
    }));

  return {
    role: result.role,
    earned: result.summary.earned,
    total: result.summary.total,
    recentlyEarned,
  };
};

const evaluate_user_badges = async (userId: string): Promise<void> => {
  try {
    const account = await Account_Model.findById(userId).select("role");
    if (!account || account.role === "MASTER") return;

    const earnedKeys = await getEarnedKeySet(userId);
    await evaluateUserBadgeKeys(userId, earnedKeys);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Badge evaluation failed for user ${userId}: ${message}`);
  }
};

const evaluate_master_badges = async (
  accountId: string,
  rankMap?: Map<string, number>,
): Promise<void> => {
  try {
    const earnedKeys = await getEarnedKeySet(accountId);
    await evaluateMasterBadgeKeys(accountId, earnedKeys, rankMap);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Badge evaluation failed for master ${accountId}: ${message}`);
  }
};

const evaluate_all_master_badges = async (): Promise<void> => {
  try {
    const rankMap = await computeMasterRankMap();
    const masters = await Master_Model.find().select("accountId");
    for (const master of masters) {
      await evaluate_master_badges(master.accountId.toString(), rankMap);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Master badge cron failed: ${message}`);
  }
};

export const badge_services = {
  get_badges_for_account,
  get_earned_badges,
  get_badge_summary,
  evaluate_user_badges,
  evaluate_master_badges,
  evaluate_all_master_badges,
  award_badge,
  getTradeStats,
  computeMasterRankMap,
};
