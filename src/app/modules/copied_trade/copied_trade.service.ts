import { AppError } from '../../utils/app_error';
import httpStatus from 'http-status';
import { Copied_Trade_Model, CopiedTradeStatus, TradeOutcome } from './copied_trade.schema';
import { Signal_Model } from '../signal/signal.schema';
import { Account_Model } from '../auth/auth.schema';
import { Master_Model } from '../master/master.schema';
import { notification_services } from '../notification/notification.service';
import { badge_services } from '../badge/badge.service';
import { system_config_services } from '../system_config/system_config.service';
import { Types } from 'mongoose';

interface TLogTrade {
  signalId: string;
  entryPrice: number;
  exitPrice: number;
  lotSize?: number;
  resultPnl?: number;
  pnlUnit?: 'usd' | 'percent';
  outcome: TradeOutcome;
  notes?: string;
  screenshotUrl?: string;
  externalPlatform?: string;
}

interface TTradeFilters {
  status?: string;
  outcome?: string;
  masterId?: string;
  assetType?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
}

export type DashboardTimeframe = 'week' | 'month' | 'all';

const getDashboardDateRange = (timeframe: DashboardTimeframe): { startDate: Date | null } => {
  if (timeframe === 'all') return { startDate: null };

  const now = new Date();
  const startDate = new Date(now);
  if (timeframe === 'week') {
    startDate.setDate(startDate.getDate() - 7);
  } else {
    startDate.setDate(startDate.getDate() - 30);
  }
  return { startDate };
};

const formatProfitLoss = (amount: number): string => {
  const rounded = Math.round(amount * 100) / 100;
  const prefix = rounded >= 0 ? '+' : '-';
  return `${prefix}$${Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Copy a signal — creates a pending trade record
 */
const copy_signal = async (userId: string, signalId: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  // Verify signal exists and is active
  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  if (signal.status !== 'active' && signal.status !== 'completed') {
    throw new AppError('Can only copy active or completed signals', httpStatus.BAD_REQUEST);
  }

  // Cannot copy your own signal
  if (signal.authorId.toString() === userId) {
    throw new AppError('You cannot copy your own signal', httpStatus.BAD_REQUEST);
  }

  // Check for duplicate copy
  const existing = await Copied_Trade_Model.findOne({
    userId: new Types.ObjectId(userId),
    signalId: new Types.ObjectId(signalId),
  });

  if (existing) {
    throw new AppError('Signal already copied', httpStatus.CONFLICT);
  }

  const copiedTrade = await Copied_Trade_Model.create({
    userId: new Types.ObjectId(userId),
    signalId: new Types.ObjectId(signalId),
    masterId: signal.authorId,
    status: 'pending',
  });

  // Increment signal copier count
  await Signal_Model.findByIdAndUpdate(signalId, {
    $inc: { copierCount: 1 },
  });

  // Notify the master that someone copied their signal
  await notification_services.create_notification({
    accountId: signal.authorId.toString(),
    type: 'signal_copied',
    title: 'Signal Copied',
    message: `A trader copied your signal: ${signal.title}`,
    link: `/signals/${signalId}`,
    data: {
      signalId,
      copiedTradeId: copiedTrade._id.toString(),
    },
  });

  return copiedTrade;
};

/**
 * Log a trade result — updates a pending copied trade with outcome
 */
const log_trade = async (userId: string, data: TLogTrade) => {
  if (!Types.ObjectId.isValid(data.signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  // Find the pending/copied trade record
  const copiedTrade = await Copied_Trade_Model.findOne({
    userId: new Types.ObjectId(userId),
    signalId: new Types.ObjectId(data.signalId),
  });

  if (!copiedTrade) {
    throw new AppError('No copied trade found. Please click "Copy Trade" first.', httpStatus.NOT_FOUND);
  }

  if (copiedTrade.status === 'completed') {
    throw new AppError('This trade has already been logged', httpStatus.CONFLICT);
  }

  // Validate external platform from dynamic config list
  if (data.externalPlatform) {
    const config = await system_config_services.get_config();
    const allowedPlatforms = config.platforms || [
      { value: 'binance', label: 'Binance' },
      { value: 'mt4', label: 'MT4' },
      { value: 'mt5', label: 'MT5' },
      { value: 'bybit', label: 'Bybit' },
    ];
    const allowedValues = allowedPlatforms.map((p) => p.value);
    if (!allowedValues.includes(data.externalPlatform)) {
      throw new AppError(
        `Invalid platform: ${data.externalPlatform}. Allowed values: ${allowedValues.join(', ')}`,
        httpStatus.BAD_REQUEST
      );
    }
  }

  // Update the trade with trade result
  const updated = await Copied_Trade_Model.findByIdAndUpdate(
    copiedTrade._id,
    {
      status: 'completed',
      entryPrice: data.entryPrice,
      exitPrice: data.exitPrice,
      lotSize: data.lotSize ?? null,
      resultPnl: data.resultPnl ?? null,
      pnlUnit: data.pnlUnit || 'usd',
      outcome: data.outcome,
      notes: data.notes ?? '',
      screenshotUrl: data.screenshotUrl ?? '',
      externalPlatform: data.externalPlatform ?? '',
      loggedAt: new Date(),
    },
    { new: true }
  );

  // Notify the master (signal owner) about the trade result — owner only
  const signal = await Signal_Model.findById(data.signalId).select('title symbol');
  const signalLabel = signal?.title || signal?.symbol || 'your signal';
  const outcomeEmoji = data.outcome === 'win' ? '🟢' : data.outcome === 'loss' ? '🔴' : '🟡';
  await notification_services.create_notification({
    accountId: copiedTrade.masterId.toString(),
    type: 'trade_result_logged',
    title: `Trade Result ${outcomeEmoji}`,
    message: `A copier logged a ${data.outcome} on your signal: ${signalLabel}`,
    link: `/signals/${data.signalId}`,
    data: {
      signalId: data.signalId,
      outcome: data.outcome,
      resultPnl: data.resultPnl,
    },
  });

  void badge_services.evaluate_user_badges(userId);

  return updated;
};

/**
 * Get user's trade history (journal)
 */
const get_trade_history = async (
  userId: string,
  page: number = 1,
  limit: number = 20,
  filters: TTradeFilters = {}
) => {
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };

  if (filters.status) query.status = filters.status;
  if (filters.outcome) query.outcome = filters.outcome;
  if (filters.masterId) query.masterId = new Types.ObjectId(filters.masterId);

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      (query.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      (query.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
    }
  }

  let sortQuery: Record<string, any> = { copiedAt: -1, createdAt: -1 };
  if (filters.sortBy === 'newest') {
    sortQuery = { copiedAt: -1, createdAt: -1 };
  }

  const trades = await Copied_Trade_Model.find(query)
    .populate('signalId', 'symbol assetType signalType title entryPrice status')
    .populate('masterId', 'name userProfileUrl')
    .sort(sortQuery)
    .skip(skip)
    .limit(limit);

  const total = await Copied_Trade_Model.countDocuments(query);

    // Compute summary stats using aggregation (Fixes H8)
  const stats = await Copied_Trade_Model.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalTrades: { $sum: 1 },
        completedTrades: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        pendingTrades: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        wins: { $sum: { $cond: [{ $eq: ["$outcome", "win"] }, 1, 0] } },
        losses: { $sum: { $cond: [{ $eq: ["$outcome", "loss"] }, 1, 0] } },
        breakevens: { $sum: { $cond: [{ $eq: ["$outcome", "breakeven"] }, 1, 0] } },
        totalPnl: { $sum: "$resultPnl" }
      }
    }
  ]);

  const s = stats.length > 0 ? stats[0] : { totalTrades: 0, completedTrades: 0, pendingTrades: 0, wins: 0, losses: 0, breakevens: 0, totalPnl: 0 };
  const winRate = s.completedTrades > 0 ? (s.wins / s.completedTrades) * 100 : 0;

  return {
    data: trades,
    summary: {
      totalTrades: s.totalTrades,
      completedTrades: s.completedTrades,
      pendingTrades: s.pendingTrades,
      wins: s.wins,
      losses: s.losses,
      breakevens: s.breakevens,
      winRate: Math.round(winRate * 100) / 100,
      totalPnl: Math.round(s.totalPnl * 100) / 100,
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single trade detail
 */
const get_trade_by_id = async (userId: string, tradeId: string) => {
  if (!Types.ObjectId.isValid(tradeId)) {
    throw new AppError('Invalid trade ID', httpStatus.BAD_REQUEST);
  }

  const trade = await Copied_Trade_Model.findOne({
    _id: new Types.ObjectId(tradeId),
    userId: new Types.ObjectId(userId),
  })
    .populate('signalId', 'symbol assetType signalType title entryPrice status authorId')
    .populate('masterId', 'name userProfileUrl');

  if (!trade) {
    throw new AppError('Trade not found', httpStatus.NOT_FOUND);
  }

  return trade;
};

/**
 * Delete a trade log
 */
const delete_trade = async (userId: string, tradeId: string) => {
  if (!Types.ObjectId.isValid(tradeId)) {
    throw new AppError('Invalid trade ID', httpStatus.BAD_REQUEST);
  }

  const trade = await Copied_Trade_Model.findOne({
    _id: new Types.ObjectId(tradeId),
    userId: new Types.ObjectId(userId),
  });

  if (!trade) {
    throw new AppError('Trade not found', httpStatus.NOT_FOUND);
  }

  await Copied_Trade_Model.findByIdAndDelete(tradeId);

  // Decrement signal copier count (Fixes H10: Ensure no negative count)
  await Signal_Model.findOneAndUpdate(
    { _id: trade.signalId, copierCount: { $gt: 0 } },
    { $inc: { copierCount: -1 } }
  );

  return { message: 'Trade deleted' };
};

/**
 * Get copiers of a specific signal (master-only — owns the signal)
 */
const get_signal_copiers = async (
  masterId: string,
  signalId: string,
  page: number = 1,
  limit: number = 20
) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  // Verify the master owns this signal
  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  if (signal.authorId.toString() !== masterId) {
    throw new AppError('You can only view copiers for your own signals', httpStatus.FORBIDDEN);
  }

  const skip = (page - 1) * limit;

  const copiers = await Copied_Trade_Model.find({
    signalId: new Types.ObjectId(signalId),
  })
    .populate('userId', 'name email userProfileUrl')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Copied_Trade_Model.countDocuments({
    signalId: new Types.ObjectId(signalId),
  });

  // Stats for this signal's copiers
  const allCopiers = await Copied_Trade_Model.find({ signalId: new Types.ObjectId(signalId) });
  const completed = allCopiers.filter((c) => c.status === 'completed');
  const wins = completed.filter((c) => c.outcome === 'win').length;
  const losses = completed.filter((c) => c.outcome === 'loss').length;
  const avgPnl = completed.length > 0
    ? completed.reduce((sum, c) => sum + (c.resultPnl || 0), 0) / completed.length
    : 0;

  return {
    data: copiers,
    stats: {
      totalCopiers: allCopiers.length,
      completed: completed.length,
      pending: allCopiers.filter((c) => c.status === 'pending').length,
      wins,
      losses,
      winRate: completed.length > 0 ? Math.round((wins / completed.length) * 10000) / 100 : 0,
      avgPnl: Math.round(avgPnl * 100) / 100,
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get aggregate copied-trade stats for a master (public)
 */
const get_master_copied_stats = async (masterId: string, timeframe: 'week' | 'month' | 'all' = 'all') => {
  if (!Types.ObjectId.isValid(masterId)) {
    throw new AppError('Invalid master ID', httpStatus.BAD_REQUEST);
  }

  // Verify master exists
  const master = await Master_Model.findOne({ accountId: new Types.ObjectId(masterId) });
  if (!master) {
    throw new AppError('Master not found', httpStatus.NOT_FOUND);
  }

  const dateFilter: Record<string, unknown> = {};
  const now = new Date();
  if (timeframe === 'week') {
    dateFilter.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
  } else if (timeframe === 'month') {
    dateFilter.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  }

  // Get all copied trades for signals authored by this master
  const query: Record<string, unknown> = { masterId: new Types.ObjectId(masterId), ...dateFilter };

  const allCopies = await Copied_Trade_Model.find(query);
  const completed = allCopies.filter((c) => c.status === 'completed');
  const wins = completed.filter((c) => c.outcome === 'win').length;
  const losses = completed.filter((c) => c.outcome === 'loss').length;
  const breakevens = completed.filter((c) => c.outcome === 'breakeven').length;
  const totalPnl = completed.reduce((sum, c) => sum + (c.resultPnl || 0), 0);
  const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;

  // Per-signal breakdown
  const signalsWithCopiers = await Signal_Model.find({
    authorId: new Types.ObjectId(masterId),
    copierCount: { $gt: 0 },
  }).select('_id symbol assetType signalType title copierCount');

  return {
    totalCopiers: allCopies.length,
    completed,
    pending: allCopies.filter((c) => c.status === 'pending').length,
    wins,
    losses,
    breakevens,
    winRate: Math.round(winRate * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgPnlPerTrade: completed.length > 0 ? Math.round((totalPnl / completed.length) * 100) / 100 : 0,
    signalsWithCopiers: signalsWithCopiers.length,
  };
};

/**
 * Cancel a pending copy (user changes mind before logging)
 */
const cancel_copy = async (userId: string, tradeId: string) => {
  if (!Types.ObjectId.isValid(tradeId)) {
    throw new AppError('Invalid trade ID', httpStatus.BAD_REQUEST);
  }

  const trade = await Copied_Trade_Model.findOne({
    _id: new Types.ObjectId(tradeId),
    userId: new Types.ObjectId(userId),
  });

  if (!trade) {
    throw new AppError('Trade not found', httpStatus.NOT_FOUND);
  }

  if (trade.status !== 'pending') {
    throw new AppError('Can only cancel pending trades', httpStatus.BAD_REQUEST);
  }

  await Copied_Trade_Model.findByIdAndDelete(tradeId);

  // Decrement signal copier count (Fixes H10: Ensure no negative count)
  await Signal_Model.findOneAndUpdate(
    { _id: trade.signalId, copierCount: { $gt: 0 } },
    { $inc: { copierCount: -1 } }
  );

  return { message: 'Copy canceled' };
};

/**
 * Signals Dashboard — aggregated stats for the authenticated user's trade journal.
 * Uses completed copied trades joined with signal symbol/asset data.
 */
const get_signals_dashboard = async (
  userId: string,
  timeframe: DashboardTimeframe = 'all'
) => {
  const { startDate } = getDashboardDateRange(timeframe);

  const matchStage: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    status: 'completed',
    loggedAt: { $ne: null },
  };

  if (startDate) {
    matchStage.loggedAt = { $gte: startDate };
  }

  const signalCollection = Signal_Model.collection.name;

  const [result] = await Copied_Trade_Model.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: signalCollection,
        localField: 'signalId',
        foreignField: '_id',
        as: 'signal',
      },
    },
    { $unwind: '$signal' },
    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              totalTrades: { $sum: 1 },
              wins: { $sum: { $cond: [{ $eq: ['$outcome', 'win'] }, 1, 0] } },
              losses: { $sum: { $cond: [{ $eq: ['$outcome', 'loss'] }, 1, 0] } },
              breakevens: { $sum: { $cond: [{ $eq: ['$outcome', 'breakeven'] }, 1, 0] } },
              profitLossUsd: {
                $sum: {
                  $cond: [{ $eq: [{ $ifNull: ['$pnlUnit', 'usd'] }, 'usd'] }, { $ifNull: ['$resultPnl', 0] }, 0]
                }
              },
              profitLossPercent: {
                $sum: {
                  $cond: [{ $eq: [{ $ifNull: ['$pnlUnit', 'usd'] }, 'percent'] }, { $ifNull: ['$resultPnl', 0] }, 0]
                }
              },
            },
          },
        ],
        bySymbol: [
          {
            $group: {
              _id: {
                symbol: '$signal.symbol',
                assetType: '$signal.assetType',
              },
              total: { $sum: 1 },
              wins: { $sum: { $cond: [{ $eq: ['$outcome', 'win'] }, 1, 0] } },
              losses: { $sum: { $cond: [{ $eq: ['$outcome', 'loss'] }, 1, 0] } },
              profitLossUsd: {
                $sum: {
                  $cond: [{ $eq: [{ $ifNull: ['$pnlUnit', 'usd'] }, 'usd'] }, { $ifNull: ['$resultPnl', 0] }, 0]
                }
              },
              profitLossPercent: {
                $sum: {
                  $cond: [{ $eq: [{ $ifNull: ['$pnlUnit', 'usd'] }, 'percent'] }, { $ifNull: ['$resultPnl', 0] }, 0]
                }
              },
            },
          },
          { $sort: { total: -1 } },
        ],
        tradeBars: [
          { $sort: { loggedAt: 1 } },
          {
            $project: {
              _id: 0,
              symbol: '$signal.symbol',
              assetType: '$signal.assetType',
              outcome: 1,
              profitLoss: { $ifNull: ['$resultPnl', 0] },
              pnlUnit: { $ifNull: ['$pnlUnit', 'usd'] },
              loggedAt: 1,
            },
          },
        ],
      },
    },
  ]);

  const overview = result?.overview?.[0] ?? {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    breakevens: 0,
    profitLossUsd: 0,
    profitLossPercent: 0,
  };

  const totalTrades = overview.totalTrades as number;
  const wins = overview.wins as number;
  const losses = overview.losses as number;
  const breakevens = overview.breakevens as number;
  const profitLossUsd = Math.round((overview.profitLossUsd as number) * 100) / 100;
  const profitLossPercent = Math.round((overview.profitLossPercent as number) * 100) / 100;

  const winLossDenominator = wins + losses;
  const winRate =
    winLossDenominator > 0
      ? Math.round((wins / winLossDenominator) * 10000) / 100
      : totalTrades > 0
        ? Math.round((wins / totalTrades) * 10000) / 100
        : 0;

  const winsPercentage =
    winLossDenominator > 0 ? Math.round((wins / winLossDenominator) * 10000) / 100 : 0;
  const lossesPercentage =
    winLossDenominator > 0 ? Math.round((losses / winLossDenominator) * 10000) / 100 : 0;

  const bySymbol = (result?.bySymbol ?? []) as Array<{
    _id: { symbol: string; assetType: string };
    total: number;
    wins: number;
    losses: number;
    profitLossUsd: number;
    profitLossPercent: number;
  }>;

  const topSymbol = bySymbol[0];

  const tradesByAsset = bySymbol.map((row) => {
    const roundedPnlUsd = Math.round(row.profitLossUsd * 100) / 100;
    const roundedPnlPercent = Math.round(row.profitLossPercent * 100) / 100;
    let barColor: 'win' | 'loss' | 'neutral' = 'neutral';
    if (row.wins > row.losses) barColor = 'win';
    else if (row.losses > row.wins) barColor = 'loss';
    else if (roundedPnlUsd > 0 || roundedPnlPercent > 0) barColor = 'win';
    else if (roundedPnlUsd < 0 || roundedPnlPercent < 0) barColor = 'loss';

    return {
      symbol: row._id.symbol,
      assetType: row._id.assetType,
      total: row.total,
      wins: row.wins,
      losses: row.losses,
      profitLossUsd: roundedPnlUsd,
      profitLossPercent: roundedPnlPercent,
      barColor,
    };
  });

  const tradeBars = ((result?.tradeBars ?? []) as Array<{
    symbol: string;
    assetType: string;
    outcome: TradeOutcome | null;
    profitLoss: number;
    pnlUnit: 'usd' | 'percent';
    loggedAt: Date;
  }>).map((bar) => ({
    symbol: bar.symbol,
    assetType: bar.assetType,
    outcome: bar.outcome,
    profitLoss: Math.round(bar.profitLoss * 100) / 100,
    pnlUnit: bar.pnlUnit || 'usd',
    barColor:
      bar.outcome === 'win' ? 'win' : bar.outcome === 'loss' ? 'loss' : ('neutral' as const),
    loggedAt: bar.loggedAt,
  }));

  return {
    timeframe,
    summary: {
      winRate,
      totalTrades,
      profitLossUsd,
      profitLossPercent,
      profitLossFormatted: formatProfitLoss(profitLossUsd),
      currency: 'USD',
      topTradedAsset: topSymbol
        ? {
            symbol: topSymbol._id.symbol,
            assetType: topSymbol._id.assetType,
            tradeCount: topSymbol.total,
          }
        : null,
    },
    winsLosses: {
      wins: { count: wins, percentage: winsPercentage },
      losses: { count: losses, percentage: lossesPercentage },
      breakevens: { count: breakevens },
    },
    tradesByAsset,
    tradeBars,
  };
};

export const copied_trade_services = {
  copy_signal,
  log_trade,
  get_trade_history,
  get_trade_by_id,
  delete_trade,
  get_signal_copiers,
  get_master_copied_stats,
  cancel_copy,
  get_signals_dashboard,
};
