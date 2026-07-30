import { AppError } from '../../utils/app_error';
import httpStatus from 'http-status';
import { Signal_Model, SignalStatus, SignalOutcome, ISignal, WorkflowStatus } from './signal.schema';
import { Master_Model } from '../master/master.schema';
import { Account_Model } from '../auth/auth.schema';
import { Copied_Trade_Model } from '../copied_trade/copied_trade.schema';
import { Types } from 'mongoose';
import { contribution_services } from '../contribution/contribution.service';
import { notification_services } from '../notification/notification.service';
import { follow_services } from '../follow/follow.service';
import { ai_services } from '../ai/ai.service';
import { SignalValidationInput } from '../ai/ai.interface';
import { audit_services } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.schema';
import { configs } from '../../configs';
import logger from '../../configs/logger';
import {
  CONFIRMABLE_WORKFLOW_STATUSES,
  REJECTABLE_WORKFLOW_STATUSES,
  RESUBMIT_AI_WORKFLOW_STATUSES,
} from './signal.workflow.constants';
import { incrementSignalUsageForAccount } from '../../middlewares/subscription_guard';
import { SignalEngagement_Model } from './signal_engagement.schema';
import { createSignalSchema, refineSignalPriceLevels } from './signal.validation';
import { z } from 'zod';

/**
 * Enforce long/short price geometry using merged current + incoming values.
 * Used on update so partial patches cannot introduce invalid levels.
 */
const assertValidPriceLevels = (levels: {
  signalType: 'long' | 'short';
  entryPrice: number;
  stopLoss?: number | null;
  takeProfit1?: number | null;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
}) => {
  const issues: z.ZodIssue[] = [];
  refineSignalPriceLevels(levels, {
    addIssue: (issue: z.ZodIssueOptionalMessage) => issues.push(issue as z.ZodIssue),
    path: [],
  } as unknown as z.RefinementCtx);

  if (issues.length > 0) {
    throw new AppError(issues[0].message, httpStatus.BAD_REQUEST);
  }
};

interface TCreateSignal {
  title: string;
  description?: string;
  assetType: 'forex' | 'crypto' | 'stocks' | 'indices' | 'commodities' | 'futures' | 'options' | 'etfs';
  symbol: string;
  signalType: 'long' | 'short';
  timeframe: string;
  entryPrice: number;
  entryNotes?: string;
  stopLoss?: number | null;
  takeProfit1?: number | null;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  isPremium?: boolean;
  tags?: string[];
  externalChartUrl?: string;
  videoUrl?: string;
  publishType?: 'instant' | 'scheduled';
  scheduledAt?: string;
}

/**
 * Resolve final signal outcome from explicit outcome, status aliases, or PnL sign.
 * Preserves backward compatibility with won/lost/completed + resultPnl.
 */
const resolveCloseOutcome = (opts: {
  explicitOutcome?: string | null;
  statusAlias?: string | null;
  resultPnl?: number | null;
}): SignalOutcome => {
  const explicit = opts.explicitOutcome;
  if (explicit === 'hit_target' || explicit === 'stopped_out' || explicit === 'cancelled') {
    return explicit;
  }

  const alias = opts.statusAlias;
  if (alias === 'hit_target' || alias === 'won') return 'hit_target';
  if (alias === 'stopped_out' || alias === 'lost') return 'stopped_out';
  if (alias === 'cancelled' || alias === 'canceled') return 'cancelled';

  if (opts.resultPnl != null) {
    return opts.resultPnl >= 0 ? 'hit_target' : 'stopped_out';
  }

  return 'hit_target';
};

const syncCopiedTradesMasterOutcome = async (
  signalId: string,
  masterOutcome: SignalOutcome
) => {
  try {
    await Copied_Trade_Model.updateMany(
      { signalId: new Types.ObjectId(signalId) },
      { $set: { masterOutcome } }
    );
  } catch (err: any) {
    logger.warn(`Failed to sync masterOutcome for signal ${signalId}: ${err?.message}`);
  }
};

const enrichSignal = (signal: ISignal & { _id?: Types.ObjectId; toObject?: () => ISignal }) => {
  const obj =
    typeof signal.toObject === 'function'
      ? (signal.toObject() as ISignal)
      : ({ ...signal } as ISignal);

  const takeProfits = [obj.takeProfit1, obj.takeProfit2, obj.takeProfit3].filter(
    (tp): tp is number => tp !== null && tp !== undefined
  );

  return {
    ...obj,
    outcome:
      obj.outcome ||
      (obj.status === 'completed'
        ? obj.resultPnl != null && obj.resultPnl < 0
          ? 'stopped_out'
          : 'hit_target'
        : obj.status === 'canceled' || obj.status === 'cancelled'
          ? 'cancelled'
          : 'pending'),
    takeProfits,
  };
};

const enrichSignals = (signals: Array<ISignal & { toObject?: () => ISignal }>) =>
  signals.map((signal) => enrichSignal(signal));

interface TCloseSignal {
  resultPnl?: number | null;
  closeNotes?: string;
  outcome?: SignalOutcome;
}

interface TSignalFilters {
  search?: string;
  assetType?: string;
  signalType?: string;
  status?: string;
  outcome?: string;
  isPremium?: boolean;
  authorId?: string;
  symbol?: string;
  sortBy?: string;
}

const assertMasterApproved = async (accountId: string) => {
  const master = await Master_Model.findOne({ accountId: new Types.ObjectId(accountId) });
  if (!master) {
    throw new AppError('Master profile not found', httpStatus.NOT_FOUND);
  }
  if (!master.isApproved) {
    throw new AppError(
      'Your Master Trader account is not approved yet. Contact admin.',
      httpStatus.FORBIDDEN
    );
  }
  return master;
};

const safeAudit = async (
  action: AuditAction,
  actorId: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {}
) => {
  try {
    await audit_services.log(action, actorId, targetType, targetId, metadata);
  } catch (err) {
    logger.warn(`Audit log failed (${action})`, { targetId, err });
  }
};

const signalToValidationInput = (signal: ISignal): SignalValidationInput => ({
  title: signal.title,
  description: signal.description,
  assetType: signal.assetType,
  symbol: signal.symbol,
  signalType: signal.signalType,
  timeframe: signal.timeframe,
  entryPrice: signal.entryPrice,
  stopLoss: signal.stopLoss,
  takeProfit1: signal.takeProfit1,
  takeProfit2: signal.takeProfit2,
  takeProfit3: signal.takeProfit3,
  entryNotes: signal.entryNotes,
});

const runAiValidationForSignal = async (signalId: string, actorId: string) => {
  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  const validation = await ai_services.validate_signal(signalToValidationInput(signal));

  const workflowStatus: WorkflowStatus =
    validation.status === 'fail' ? 'ai_failed' : 'mt_pending';

  const updated = await Signal_Model.findByIdAndUpdate(
    signalId,
    {
      workflowStatus,
      status: 'draft',
      aiValidation: {
        status: validation.status,
        score: validation.score,
        summary: validation.summary,
        risks: validation.risks,
        suggestedEdits: validation.suggestedEdits,
        validatedAt: new Date(),
        model: validation.model,
        rawResponse: validation.rawResponse,
      },
    },
    { new: true }
  );

  await safeAudit('signal_ai_validated', actorId, 'signal', signalId, {
    status: validation.status,
    score: validation.score,
  });

  try {
    await notification_services.create_notification({
      accountId: actorId,
      type: validation.status === 'fail' ? 'signal_ai_reviewed' : 'signal_mt_pending',
      title:
        validation.status === 'fail'
          ? 'Signal needs revision'
          : 'Signal ready for your review',
      message: validation.summary,
      link: `/signals/${signalId}/review`,
      data: { signalId, aiStatus: validation.status },
    });
  } catch (err) {
    logger.warn('AI validation notification failed', { signalId, err });
  }

  return updated;
};

const publishApprovedSignal = async (
  signal: ISignal & { _id: Types.ObjectId },
  accountId: string
) => {
  const signalId = signal._id.toString();
  const publishType = signal.publishType || 'instant';
  const now = new Date();
  let status: SignalStatus = 'active';
  let publishedAt: Date | null = now;

  if (publishType === 'scheduled' && signal.scheduledAt && signal.scheduledAt > now) {
    status = 'scheduled';
    publishedAt = null;
  }

  const updated = await Signal_Model.findByIdAndUpdate(
    signalId,
    {
      status,
      workflowStatus: 'active',
      publishedAt,
      mtReview: {
        confirmedAt: now,
        confirmedBy: new Types.ObjectId(accountId),
        rejectedAt: null,
        rejectionReason: '',
      },
    },
    { new: true }
  );

  if (status === 'active') {
    await Master_Model.findOneAndUpdate({ accountId }, { $inc: { totalSignals: 1 } });
    contribution_services.track_contribution(accountId, 'create_signal', signalId);
    await notifyFollowersOfNewSignal(signalId, accountId);
  }

  return updated;
};

/**
 * Create a new signal (Master only)
 * Supports instant publish (default) and scheduled publish
 * When SIGNAL_AI_WORKFLOW_ENABLED=true: draft → AI → MT confirm → publish
 */
const create_signal = async (accountId: string, data: TCreateSignal) => {
  const account = await Account_Model.findById(accountId);
  if (!account) {
    throw new AppError('Account not found', httpStatus.NOT_FOUND);
  }

  const isAdmin = account.role === 'ADMIN';
  const isMaster = account.role === 'MASTER';

  if (!isAdmin && !isMaster) {
    throw new AppError('Only Master Traders or Admins can create signals', httpStatus.FORBIDDEN);
  }

  if (isMaster) {
    await assertMasterApproved(accountId);
  }

  const publishType = data.publishType || 'instant';
  let scheduledAt: Date | null = null;

  if (publishType === 'scheduled') {
    if (!data.scheduledAt) {
      throw new AppError('scheduledAt is required when publishType is scheduled', httpStatus.BAD_REQUEST);
    }
    scheduledAt = new Date(data.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      throw new AppError('Invalid scheduledAt date format', httpStatus.BAD_REQUEST);
    }
  }

  if (configs.features.signalAiWorkflow && !isAdmin) {
    const signal = await Signal_Model.create({
      ...data,
      authorId: new Types.ObjectId(accountId),
      status: 'draft',
      workflowStatus: 'ai_pending',
      publishType,
      scheduledAt,
      publishedAt: null,
      outcome: 'pending',
      stopLoss: data.stopLoss ?? null,
      takeProfit1: data.takeProfit1 ?? null,
      takeProfit2: data.takeProfit2 ?? null,
      takeProfit3: data.takeProfit3 ?? null,
      aiValidation: null,
      mtReview: null,
    });

    const signalId = signal._id.toString();
    try {
      const validated = await runAiValidationForSignal(signalId, accountId);
      return enrichSignal(validated!);
    } catch (err) {
      await Signal_Model.findByIdAndUpdate(signalId, { workflowStatus: 'draft' });
      throw err;
    }
  }

  let status: SignalStatus = 'active';
  let publishedAt: Date | null = null;

  if (publishType === 'scheduled') {
    status = 'scheduled';
  } else {
    publishedAt = new Date();
  }

  const signal = await Signal_Model.create({
    ...data,
    authorId: new Types.ObjectId(accountId),
    status,
    workflowStatus: 'active',
    publishType,
    scheduledAt,
    publishedAt,
    outcome: 'pending',
    stopLoss: data.stopLoss ?? null,
    takeProfit1: data.takeProfit1 ?? null,
    takeProfit2: data.takeProfit2 ?? null,
    takeProfit3: data.takeProfit3 ?? null,
  });

  if (publishType === 'instant') {
    if (isMaster) {
      await Master_Model.findOneAndUpdate({ accountId }, { $inc: { totalSignals: 1 } });
    }
    contribution_services.track_contribution(accountId, 'create_signal', signal._id.toString());
    await notifyFollowersOfNewSignal(signal._id.toString(), accountId);
  }

  return enrichSignal(signal);
};

/**
 * Create a signal from a JSON payload (automates AI-assisted signal creation).
 */
const create_signal_from_json = async (
  accountId: string,
  payload: { signal: TCreateSignal; skipAiWorkflow?: boolean }
) => {
  const { signal: signalData, skipAiWorkflow = false } = payload;

  const account = await Account_Model.findById(accountId);
  const isAdmin = account?.role === 'ADMIN';

  if (skipAiWorkflow || !configs.features.signalAiWorkflow || isAdmin) {
    return create_signal(accountId, signalData);
  }

  if (!account) {
    throw new AppError('Account not found', httpStatus.NOT_FOUND);
  }

  const isMaster = account.role === 'MASTER';

  if (!isAdmin && !isMaster) {
    throw new AppError('Only Master Traders or Admins can create signals', httpStatus.FORBIDDEN);
  }

  if (isMaster) {
    await assertMasterApproved(accountId);
  }

  const publishType = signalData.publishType || 'instant';
  let scheduledAt: Date | null = null;

  if (publishType === 'scheduled' && signalData.scheduledAt) {
    scheduledAt = new Date(signalData.scheduledAt);
  }

  const signal = await Signal_Model.create({
    ...signalData,
    authorId: new Types.ObjectId(accountId),
    status: 'draft',
    workflowStatus: 'ai_pending',
    publishType,
    scheduledAt,
    publishedAt: null,
    outcome: 'pending',
    stopLoss: signalData.stopLoss ?? null,
    takeProfit1: signalData.takeProfit1 ?? null,
    takeProfit2: signalData.takeProfit2 ?? null,
    takeProfit3: signalData.takeProfit3 ?? null,
    aiValidation: null,
    mtReview: null,
  });

  const signalId = signal._id.toString();
  try {
    const validated = await runAiValidationForSignal(signalId, accountId);
    return enrichSignal(validated!);
  } catch (err) {
    await Signal_Model.findByIdAndUpdate(signalId, { workflowStatus: 'draft' });
    throw err;
  }
};

const MAX_LOOSE_JSON_CHARS = 15000;

/**
 * Create a signal from loosely-formatted JSON: AI maps arbitrary field names
 * and value formats onto the signal schema, then the result goes through the
 * same validation and creation pipeline as a standard JSON import.
 */
const create_signal_from_loose_json = async (
  accountId: string,
  payload: { content: unknown; skipAiWorkflow?: boolean }
) => {
  const { content, skipAiWorkflow = false } = payload;

  const rawContent =
    typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  if (!rawContent.trim()) {
    throw new AppError('The uploaded file is empty', httpStatus.BAD_REQUEST);
  }

  if (rawContent.length > MAX_LOOSE_JSON_CHARS) {
    throw new AppError(
      `File is too large for AI extraction (max ${MAX_LOOSE_JSON_CHARS} characters)`,
      httpStatus.BAD_REQUEST
    );
  }

  const extraction = await ai_services.extract_signal_from_json(rawContent);

  if (!extraction) {
    throw new AppError(
      'AI extraction is unavailable. Please format your file to match the standard signal JSON template and use the regular import.',
      httpStatus.SERVICE_UNAVAILABLE
    );
  }

  if (!extraction.signal) {
    const reason = extraction.notes.length
      ? extraction.notes.join(' ')
      : 'Required trade details (symbol, entry price, direction) could not be identified.';
    throw new AppError(
      `AI could not extract a valid signal from the file: ${reason}`,
      httpStatus.UNPROCESSABLE_ENTITY
    );
  }

  const parsed = createSignalSchema.safeParse(extraction.signal);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new AppError(
      `AI-extracted signal failed validation: ${issues}`,
      httpStatus.UNPROCESSABLE_ENTITY
    );
  }

  logger.info(
    `AI extracted signal from loose JSON for account ${accountId} (confidence: ${extraction.confidence})`
  );

  const created = await create_signal_from_json(accountId, {
    signal: parsed.data as TCreateSignal,
    skipAiWorkflow,
  });

  return {
    signal: created,
    extraction: {
      confidence: extraction.confidence,
      notes: extraction.notes,
      model: extraction.model,
    },
  };
};

/**
 * Notify all followers of a Master Trader about a new signal.
 * Used for both instant and scheduled signal publishing.
 */
const notifyFollowersOfNewSignal = async (signalId: string, masterAccountId: string) => {
  try {
    const followers = await follow_services.get_followers(masterAccountId, 1, 10000);

    if (!followers.data || followers.data.length === 0) {
      return { notifiedCount: 0 };
    }

    // Populate signal details for notification content
    const signal = await Signal_Model.findById(signalId);
    if (!signal) return { notifiedCount: 0 };

    const master = await Account_Model.findById(masterAccountId).select('name');
    const masterName = master?.name || 'Master Trader';

    const notifications = followers.data.map((follow: any) => ({
      accountId: follow.followerId._id.toString(),
      type: 'new_signal' as const,
      title: `New signal from ${masterName}`,
      message: signal.title,
      link: `/signals/${signalId}`,
      data: {
        signalId,
        symbol: signal.symbol,
        signalType: signal.signalType,
      },
    }));

    const result = await notification_services.create_many_notifications(notifications);
    logger.info(
      `📢 Notified ${result.createdCount}/${notifications.length} followers about new signal ${signalId}`
    );
    return result;
  } catch (error: any) {
    logger.error(`❌ Failed to notify followers for signal ${signalId}: ${error.message}`);
    return { notifiedCount: 0 };
  }
};

/**
 * Update a signal (Master: own signals, Admin: any signal)
 * If body contains `status: 'completed'` with `resultPnl`, triggers close logic
 * (updates master win/loss stats, tracks contribution, records outcome).
 */
const update_signal = async (
  accountId: string,
  signalId: string,
  data: Partial<TCreateSignal> &
    TCloseSignal & { status?: SignalStatus | 'won' | 'lost' | 'hit_target' | 'stopped_out' | 'pending' }
) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  const account = await Account_Model.findById(accountId);
  const isAdmin = account?.role === 'ADMIN';

  if (!isAdmin && signal.authorId.toString() !== accountId) {
    throw new AppError('You can only update your own signals', httpStatus.FORBIDDEN);
  }

  // Stats/contributions belong to the signal author, even when an admin edits
  const authorAccountId = signal.authorId.toString();

  // Normalize status for virtual statuses (won/lost/hit_target/stopped_out/…)
  const requestedStatus = data.status;
  let finalStatus = data.status as SignalStatus | undefined;
  let finalResultPnl = data.resultPnl;

  if (finalStatus === ('won' as any) || finalStatus === ('hit_target' as any)) {
    finalStatus = 'completed';
    if (finalResultPnl === undefined || finalResultPnl === null) finalResultPnl = 1;
  } else if (finalStatus === ('lost' as any) || finalStatus === ('stopped_out' as any)) {
    finalStatus = 'completed';
    if (finalResultPnl === undefined || finalResultPnl === null) finalResultPnl = -1;
  } else if (finalStatus === ('published' as any) || finalStatus === ('pending' as any)) {
    finalStatus = 'active';
  } else if (finalStatus === ('closed' as any)) {
    // Backward-compat: accept legacy 'closed' input and normalize to 'completed'
    finalStatus = 'completed';
  } else if (finalStatus === ('cancelled' as any)) {
    finalStatus = 'canceled';
  }

  // Detect close action: status set to 'completed' with resultPnl provided,
  // or explicit hit_target/stopped_out outcome while completing.
  const explicitOutcome = data.outcome;
  const isClosing =
    finalStatus === 'completed' &&
    (finalResultPnl !== undefined && finalResultPnl !== null);

  if (isClosing) {
    if (signal.status === 'completed') {
      throw new AppError('Signal is already closed', httpStatus.BAD_REQUEST);
    }

    const master = await Master_Model.findOne({ accountId: authorAccountId });
    const outcome = resolveCloseOutcome({
      explicitOutcome,
      statusAlias: requestedStatus,
      resultPnl: finalResultPnl,
    });

    const updates: Record<string, unknown> = {
      status: 'completed',
      outcome,
      closedAt: new Date(),
      resultPnl: finalResultPnl,
      pnlUnit: (data as any).pnlUnit || 'usd',
      closeNotes: data.closeNotes || '',
    };

    const updated = await Signal_Model.findByIdAndUpdate(signalId, updates, { new: true });
    await syncCopiedTradesMasterOutcome(signalId, outcome);

    // Update master win/loss stats
    if (master && finalResultPnl !== null && finalResultPnl !== undefined) {
      const incField =
        outcome === 'hit_target' || finalResultPnl >= 0 ? 'winningSignals' : 'losingSignals';
      await Master_Model.findOneAndUpdate(
        { accountId: authorAccountId },
        { $inc: { [incField]: 1 } }
      );

      // Recalculate win rate
      const updatedMaster = await Master_Model.findOne({ accountId: authorAccountId });
      if (updatedMaster) {
        const total = updatedMaster.winningSignals + updatedMaster.losingSignals;
        const winRate = total > 0 ? (updatedMaster.winningSignals / total) * 100 : 0;
        await Master_Model.findOneAndUpdate(
          { accountId: authorAccountId },
          { winRate: Math.round(winRate * 100) / 100 }
        );
      }

      // Track contribution for closing signal
      const activityType =
        outcome === 'hit_target' || finalResultPnl >= 0
          ? 'close_signal_profit'
          : 'close_signal_loss';
      contribution_services.track_contribution(authorAccountId, activityType, signalId);
    }

    return enrichSignal(updated!);
  }

  const editableStatuses = ['active', 'scheduled', 'draft'];
  const editableWorkflow = ['ai_failed', 'draft', 'mt_pending', 'ai_passed'];
  const canEditWorkflow =
    !signal.workflowStatus ||
    signal.workflowStatus === 'active' ||
    editableWorkflow.includes(signal.workflowStatus);

  if (!editableStatuses.includes(signal.status) && signal.status !== 'draft') {
    if (!canEditWorkflow) {
      throw new AppError('Cannot update completed, expired or canceled signals', httpStatus.BAD_REQUEST);
    }
  }

  const updatePayload: Record<string, unknown> = { ...data };
  delete updatePayload.resultPnl;
  delete (updatePayload as any).pnlUnit;
  delete updatePayload.closeNotes;
  delete updatePayload.outcome;

  if ('takeProfit1' in data) updatePayload.takeProfit1 = data.takeProfit1 ?? null;
  if ('takeProfit2' in data) updatePayload.takeProfit2 = data.takeProfit2 ?? null;
  if ('takeProfit3' in data) updatePayload.takeProfit3 = data.takeProfit3 ?? null;

  const priceFieldsTouched =
    data.signalType !== undefined ||
    data.entryPrice !== undefined ||
    'stopLoss' in data ||
    'takeProfit1' in data ||
    'takeProfit2' in data ||
    'takeProfit3' in data;

  if (priceFieldsTouched) {
    assertValidPriceLevels({
      signalType: (data.signalType ?? signal.signalType) as 'long' | 'short',
      entryPrice: data.entryPrice ?? signal.entryPrice,
      stopLoss: 'stopLoss' in data ? data.stopLoss ?? null : signal.stopLoss,
      takeProfit1: 'takeProfit1' in data ? data.takeProfit1 ?? null : signal.takeProfit1,
      takeProfit2: 'takeProfit2' in data ? data.takeProfit2 ?? null : signal.takeProfit2,
      takeProfit3: 'takeProfit3' in data ? data.takeProfit3 ?? null : signal.takeProfit3,
    });
  }

  const nextOutcome: SignalOutcome | undefined =
    finalStatus === 'canceled'
      ? 'cancelled'
      : explicitOutcome === 'cancelled'
        ? 'cancelled'
        : undefined;

  if (nextOutcome === 'cancelled') {
    await syncCopiedTradesMasterOutcome(signalId, 'cancelled');
  }

  const updated = await Signal_Model.findByIdAndUpdate(
    signalId,
    {
      $set: {
        ...updatePayload,
        status: finalStatus ?? signal.status,
        ...(finalResultPnl !== undefined ? { resultPnl: finalResultPnl } : {}),
        ...(nextOutcome ? { outcome: nextOutcome } : {}),
      },
    },
    { new: true }
  );

  return enrichSignal(updated!);
};

const get_review_queue = async (accountId: string, page = 1, limit = 20) => {
  await assertMasterApproved(accountId);

  const skip = (page - 1) * limit;
  const query = {
    authorId: new Types.ObjectId(accountId),
    workflowStatus: { $in: ['mt_pending', 'ai_failed', 'ai_passed'] as WorkflowStatus[] },
  };

  const [data, total] = await Promise.all([
    Signal_Model.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Signal_Model.countDocuments(query),
  ]);

  return {
    data: enrichSignals(data),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const confirm_signal = async (accountId: string, signalId: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const account = await Account_Model.findById(accountId);
  const isAdmin = account?.role === 'ADMIN';

  if (!isAdmin) {
    await assertMasterApproved(accountId);
  }

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  if (!isAdmin && signal.authorId.toString() !== accountId) {
    throw new AppError('You can only confirm your own signals', httpStatus.FORBIDDEN);
  }

  if (
    !signal.workflowStatus ||
    !CONFIRMABLE_WORKFLOW_STATUSES.includes(signal.workflowStatus)
  ) {
    throw new AppError(
      'Signal is not awaiting Master confirmation',
      httpStatus.BAD_REQUEST
    );
  }

  const published = await publishApprovedSignal(signal, accountId);

  await safeAudit('signal_mt_confirmed', accountId, 'signal', signalId, {
    publishType: signal.publishType,
  });

  return published;
};

const reject_signal = async (
  accountId: string,
  signalId: string,
  rejectionReason?: string
) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const account = await Account_Model.findById(accountId);
  const isAdmin = account?.role === 'ADMIN';

  if (!isAdmin) {
    await assertMasterApproved(accountId);
  }

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  if (!isAdmin && signal.authorId.toString() !== accountId) {
    throw new AppError('You can only reject your own signals', httpStatus.FORBIDDEN);
  }

  if (
    !signal.workflowStatus ||
    !REJECTABLE_WORKFLOW_STATUSES.includes(signal.workflowStatus)
  ) {
    throw new AppError(
      'Signal cannot be rejected in its current state',
      httpStatus.BAD_REQUEST
    );
  }

  const updated = await Signal_Model.findByIdAndUpdate(
    signalId,
    {
      workflowStatus: 'rejected',
      status: 'canceled',
      outcome: 'cancelled',
      mtReview: {
        confirmedAt: null,
        confirmedBy: new Types.ObjectId(accountId),
        rejectedAt: new Date(),
        rejectionReason: rejectionReason || 'Rejected by Master Trader',
      },
    },
    { new: true }
  );

  await syncCopiedTradesMasterOutcome(signalId, 'cancelled');

  await safeAudit('signal_mt_rejected', accountId, 'signal', signalId, {
    rejectionReason,
  });

  return updated;
};

const resubmit_ai_validation = async (accountId: string, signalId: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  await assertMasterApproved(accountId);

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  if (signal.authorId.toString() !== accountId) {
    throw new AppError('Forbidden', httpStatus.FORBIDDEN);
  }

  if (
    !signal.workflowStatus ||
    !RESUBMIT_AI_WORKFLOW_STATUSES.includes(signal.workflowStatus)
  ) {
    throw new AppError('Signal cannot be resubmitted for AI validation', httpStatus.BAD_REQUEST);
  }

  await Signal_Model.findByIdAndUpdate(signalId, { workflowStatus: 'ai_pending' });
  try {
    return await runAiValidationForSignal(signalId, accountId);
  } catch (err) {
    await Signal_Model.findByIdAndUpdate(signalId, { workflowStatus: signal.workflowStatus });
    throw err;
  }
};

const ai_assist_signal = async (accountId: string, signalId: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  await assertMasterApproved(accountId);

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  if (signal.authorId.toString() !== accountId) {
    throw new AppError('You can only request assist on your own signals', httpStatus.FORBIDDEN);
  }

  const result = await ai_services.assist_master_signal(signalToValidationInput(signal));

  await safeAudit('signal_ai_assist', accountId, 'signal', signalId, {
    model: result.model,
  });

  return result;
};

/**
 * Delete a signal (soft delete — set to expired)
 */
const delete_signal = async (accountId: string, signalId: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  if (signal.authorId.toString() !== accountId) {
    const account = await Account_Model.findById(accountId);
    if (account?.role !== 'ADMIN') {
      throw new AppError('You can only delete your own signals', httpStatus.FORBIDDEN);
    }
  }

  await Signal_Model.findByIdAndUpdate(signalId, { status: 'expired' });

  return { message: 'Signal deleted successfully' };
};

/**
 * Shared filtering logic for signal queries
 */
const apply_filters = (query: any, filters: TSignalFilters) => {
  // Search by symbol or title
  if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
    const searchTerm = filters.search.trim();
    query.$or = [
      { symbol: { $regex: searchTerm, $options: 'i' } },
      { title: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (filters.assetType) query.assetType = filters.assetType;
  if (filters.signalType) query.signalType = filters.signalType;
  if (filters.symbol) {
    query.symbol = { $regex: `^${filters.symbol.trim()}$`, $options: 'i' };
  }
  
  // Handle status filtering (support virtual statuses won/lost/hit_target/stopped_out/pending)
  if (filters.status) {
    if (filters.status === "all") {
      // No status filter applied
    } else if (filters.status === 'hit_target') {
      query.status = 'completed';
      query.outcome = 'hit_target';
    } else if (filters.status === 'stopped_out') {
      query.status = 'completed';
      query.outcome = 'stopped_out';
    } else if (filters.status === 'won') {
      query.status = 'completed';
      query.resultPnl = { $gte: 0 };
    } else if (filters.status === 'lost') {
      query.status = 'completed';
      query.resultPnl = { $lt: 0 };
    } else if (filters.status === 'pending') {
      query.status = { $in: ['active', 'scheduled', 'draft'] };
      query.outcome = 'pending';
    } else if (filters.status === 'published') {
      query.status = 'active';
    } else if (filters.status === 'closed') {
      // Backward-compat: legacy 'closed' filter maps to 'completed'
      query.status = 'completed';
    } else if (filters.status === 'cancelled') {
      query.status = 'canceled';
    } else {
      query.status = filters.status;
    }
  }

  if (filters.outcome) {
    query.outcome = filters.outcome;
  }

  if (filters.isPremium !== undefined) query.isPremium = filters.isPremium;
  if (filters.authorId) query.authorId = new Types.ObjectId(filters.authorId);
};

const get_signals = async (
  page: number = 1,
  limit: number = 20,
  filters: TSignalFilters = {},
  viewerAccountId?: string
) => {
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = {};

  apply_filters(query, filters);

  if (!filters.status || filters.status === '') {
    query.status = 'active';
    const workflowFilter = {
      $or: [{ workflowStatus: 'active' }, { workflowStatus: { $exists: false } }],
    };
    if (query.$or) {
      query.$and = [{ $or: query.$or as unknown[] }, workflowFilter];
      delete query.$or;
    } else {
      Object.assign(query, workflowFilter);
    }
  }

  const sortQuery: Record<string, any> = { publishedAt: -1, createdAt: -1 };

  const signals = await Signal_Model.find(query)
    .populate('authorId', 'name userProfileUrl')
    .sort(sortQuery)
    .skip(skip)
    .limit(limit);

  const total = await Signal_Model.countDocuments(query);
  let enrichedData = enrichSignals(signals);

  if (viewerAccountId) {
    const signalIds = signals.map((s) => s._id);
    const [copiedTrades, engagements] = await Promise.all([
      Copied_Trade_Model.find({
        userId: new Types.ObjectId(viewerAccountId),
        signalId: { $in: signalIds },
      }).select('signalId'),
      SignalEngagement_Model.find({
        accountId: new Types.ObjectId(viewerAccountId),
        signalId: { $in: signalIds },
        type: { $in: ['like', 'bookmark'] },
      }).select('signalId type'),
    ]);

    const copiedSignalIdsSet = new Set(copiedTrades.map((t) => t.signalId.toString()));
    const likedSignalIdsSet = new Set(
      engagements.filter((e) => e.type === 'like').map((e) => e.signalId.toString())
    );
    const bookmarkedSignalIdsSet = new Set(
      engagements.filter((e) => e.type === 'bookmark').map((e) => e.signalId.toString())
    );

    enrichedData = enrichedData.map((s: any) => {
      const id = (s._id || s.id).toString();
      return {
        ...s,
        isCopied: copiedSignalIdsSet.has(id),
        isLiked: likedSignalIdsSet.has(id),
        isBookmarked: bookmarkedSignalIdsSet.has(id),
      };
    }) as any;
  } else {
    enrichedData = enrichedData.map((s) => ({
      ...s,
      isCopied: false,
      isLiked: false,
      isBookmarked: false,
    })) as any;
  }

  return {
    data: enrichedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const get_signal_by_id = async (
  signalId: string,
  includeUnpublished = false,
  viewerAccountId?: string
) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const signal = await Signal_Model.findById(signalId).populate(
    'authorId',
    'name userProfileUrl'
  );
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  // The signal owner and admins can always view the signal regardless of its
  // status (e.g. scheduled, completed, won, lost). Everyone else can only see
  // published/active signals.
  const ownerId =
    signal.authorId instanceof Types.ObjectId
      ? signal.authorId.toString()
      : String((signal.authorId as { _id: Types.ObjectId })._id);

  const isOwner = !!viewerAccountId && ownerId === viewerAccountId;

  let isAdmin = false;
  if (!isOwner && viewerAccountId) {
    const viewerAccount = await Account_Model.findById(viewerAccountId).select('role');
    isAdmin = viewerAccount?.role === 'ADMIN';
  }

  if (!includeUnpublished && !isOwner && !isAdmin) {
    const isActive =
      signal.status === 'active' &&
      (signal.workflowStatus === 'active' || signal.workflowStatus === undefined);

    if (!isActive) {
      throw new AppError('Signal not found', httpStatus.NOT_FOUND);
    }
  }

  if (!isOwner && !isAdmin && signal.isPremium && viewerAccountId) {
    const viewer = await Account_Model.findById(viewerAccountId);
    if (viewer && viewer.role !== 'ADMIN' && viewer.role !== 'MASTER') {
      const tier = (viewer.subscriptionTier || 'free').toLowerCase();
      const status = (viewer.subscriptionStatus || '').toLowerCase();
      const hasAccess =
        ['pro', 'master'].includes(tier) &&
        ['active', 'trialing'].includes(status);

      if (!hasAccess) {
        throw new AppError(
          'Upgrade to Pro to access premium signals',
          httpStatus.FORBIDDEN
        );
      }

      await incrementSignalUsageForAccount(viewerAccountId);
    }
  } else if (signal.isPremium && !viewerAccountId) {
    throw new AppError(
      'Authentication required to view premium signals',
      httpStatus.UNAUTHORIZED
    );
  }

  const enriched = enrichSignal(signal);
  let isCopied = false;
  let isLiked = false;
  let isBookmarked = false;
  if (viewerAccountId) {
    const [copyExists, engagements] = await Promise.all([
      Copied_Trade_Model.exists({
        userId: new Types.ObjectId(viewerAccountId),
        signalId: new Types.ObjectId(signalId),
      }),
      SignalEngagement_Model.find({
        accountId: new Types.ObjectId(viewerAccountId),
        signalId: new Types.ObjectId(signalId),
        type: { $in: ['like', 'bookmark'] },
      }).select('type'),
    ]);
    isCopied = !!copyExists;
    isLiked = engagements.some((e) => e.type === 'like');
    isBookmarked = engagements.some((e) => e.type === 'bookmark');
  }

  return {
    ...enriched,
    isCopied,
    isLiked,
    isBookmarked,
  };
};

const get_my_signals = async (
  accountId: string,
  page: number = 1,
  limit: number = 20,
  filters: TSignalFilters = {}
) => {
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = { authorId: new Types.ObjectId(accountId) };

  apply_filters(query, filters);

  const signals = await Signal_Model.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Signal_Model.countDocuments(query);

  return {
    data: enrichSignals(signals),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Increment view count
 */
const increment_view = async (signalId: string, viewerId?: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  await Signal_Model.findByIdAndUpdate(signalId, { $inc: { viewCount: 1 } });

  if (viewerId) {
    contribution_services.track_contribution(viewerId, 'view_signal', signalId);
  }
};

const getEngagementCounts = async (signalId: string) => {
  const signal = await Signal_Model.findById(signalId).select('likeCount bookmarkCount');
  return {
    likeCount: Math.max(0, signal?.likeCount ?? 0),
    bookmarkCount: Math.max(0, signal?.bookmarkCount ?? 0),
  };
};

/**
 * Toggle like on a signal
 */
const like_signal = async (accountId: string, signalId: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  const existing = await SignalEngagement_Model.findOneAndDelete({
    accountId: new Types.ObjectId(accountId),
    signalId: new Types.ObjectId(signalId),
    type: 'like',
  });

  if (existing) {
    await Signal_Model.findByIdAndUpdate(signalId, { $inc: { likeCount: -1 } });
    const counts = await getEngagementCounts(signalId);
    return {
      message: 'Unliked',
      isLiked: false,
      likeCount: counts.likeCount,
    };
  }

  await SignalEngagement_Model.create({
    accountId: new Types.ObjectId(accountId),
    signalId: new Types.ObjectId(signalId),
    type: 'like',
  });
  await Signal_Model.findByIdAndUpdate(signalId, { $inc: { likeCount: 1 } });
  contribution_services.track_contribution(accountId, 'like_signal', signalId);
  const counts = await getEngagementCounts(signalId);

  return {
    message: 'Liked',
    isLiked: true,
    likeCount: counts.likeCount,
  };
};

/**
 * Unlike a signal (explicit DELETE)
 */
const unlike_signal = async (accountId: string, signalId: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  const deleted = await SignalEngagement_Model.findOneAndDelete({
    accountId: new Types.ObjectId(accountId),
    signalId: new Types.ObjectId(signalId),
    type: 'like',
  });

  if (deleted) {
    await Signal_Model.findByIdAndUpdate(signalId, { $inc: { likeCount: -1 } });
  }

  const counts = await getEngagementCounts(signalId);
  return {
    message: 'Unliked',
    isLiked: false,
    likeCount: counts.likeCount,
  };
};

/**
 * Toggle bookmark on a signal
 */
const bookmark_signal = async (accountId: string, signalId: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  const existing = await SignalEngagement_Model.findOneAndDelete({
    accountId: new Types.ObjectId(accountId),
    signalId: new Types.ObjectId(signalId),
    type: 'bookmark',
  });

  if (existing) {
    await Signal_Model.findByIdAndUpdate(signalId, { $inc: { bookmarkCount: -1 } });
    const counts = await getEngagementCounts(signalId);
    return {
      message: 'Unsaved',
      isBookmarked: false,
      bookmarkCount: counts.bookmarkCount,
    };
  }

  await SignalEngagement_Model.create({
    accountId: new Types.ObjectId(accountId),
    signalId: new Types.ObjectId(signalId),
    type: 'bookmark',
  });
  await Signal_Model.findByIdAndUpdate(signalId, { $inc: { bookmarkCount: 1 } });
  contribution_services.track_contribution(accountId, 'bookmark_signal', signalId);
  const counts = await getEngagementCounts(signalId);

  return {
    message: 'Saved',
    isBookmarked: true,
    bookmarkCount: counts.bookmarkCount,
  };
};

/**
 * Remove bookmark (explicit DELETE)
 */
const unbookmark_signal = async (accountId: string, signalId: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  const deleted = await SignalEngagement_Model.findOneAndDelete({
    accountId: new Types.ObjectId(accountId),
    signalId: new Types.ObjectId(signalId),
    type: 'bookmark',
  });

  if (deleted) {
    await Signal_Model.findByIdAndUpdate(signalId, { $inc: { bookmarkCount: -1 } });
  }

  const counts = await getEngagementCounts(signalId);
  return {
    message: 'Unsaved',
    isBookmarked: false,
    bookmarkCount: counts.bookmarkCount,
  };
};

/**
 * Share a signal
 */
const share_signal = async (accountId: string, signalId: string) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const signal = await Signal_Model.findById(signalId);
  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  contribution_services.track_contribution(accountId, 'share_signal', signalId);
  return { message: 'Signal shared successfully' };
};

const publish_scheduled_signals = async () => {
  const now = new Date();
  
  const signals = await Signal_Model.find({
    status: 'scheduled',
    publishType: 'scheduled',
    scheduledAt: { $lte: now },
    workflowStatus: { $in: ['active', null] },
  });

  if (signals.length === 0) {
    return { total: 0, published: 0, notified: 0, errors: 0 };
  }

  let published = 0;
  let notified = 0;
  let errors = 0;

  for (const signal of signals) {
    try {
      const updated = await Signal_Model.findOneAndUpdate(
        {
          _id: signal._id,
          status: 'scheduled',
          publishType: 'scheduled',
          scheduledAt: { $lte: now },
        },
        {
          status: 'active',
          publishedAt: now,
        },
        { new: true }
      );

      if (!updated) {
        continue;
      }

      await Master_Model.findOneAndUpdate(
        { accountId: updated.authorId },
        { $inc: { totalSignals: 1 } }
      );

      await contribution_services.track_contribution(
        updated.authorId.toString(),
        'create_signal',
        updated._id.toString()
      );

      await notifyFollowersOfNewSignal(updated._id.toString(), updated.authorId.toString());
      
      published++;
      notified++;
    } catch (error: any) {
      logger.error(`Failed to publish scheduled signal ${signal._id}: ${error.message}`);
      errors++;
    }
  }

  return { total: signals.length, published, notified, errors };
};

const toggle_featured_signal = async (signalId: string, isFeatured: boolean) => {
  if (!Types.ObjectId.isValid(signalId)) {
    throw new AppError('Invalid signal ID', httpStatus.BAD_REQUEST);
  }

  const signal = await Signal_Model.findByIdAndUpdate(
    signalId,
    { isFeatured },
    { new: true }
  );

  if (!signal) {
    throw new AppError('Signal not found', httpStatus.NOT_FOUND);
  }

  return signal;
};

export const SIGNAL_STATUS_DEFINITIONS = {
  active: 'Live signal visible to followers and subscribers. Set on instant publish or after MT confirms.',
  scheduled: 'Waiting for scheduled publish time.',
  completed: 'Trade finished by Master with PnL result logged.',
  canceled: 'Rejected or canceled before/during review.',
  expired: 'Soft-deleted signal (via delete action).',
  draft: 'Not yet published; used during AI workflow.',
};

export const SIGNAL_OUTCOME_DEFINITIONS = {
  pending: 'Signal is open; no final result yet.',
  hit_target: 'Price reached take-profit target(s).',
  stopped_out: 'Price hit stop loss.',
  cancelled: 'Signal was canceled before a result.',
};

export const signal_services = {
  create_signal,
  create_signal_from_json,
  create_signal_from_loose_json,
  update_signal,
  delete_signal,
  get_signals,
  get_signal_by_id,
  get_my_signals,
  get_review_queue,
  confirm_signal,
  reject_signal,
  resubmit_ai_validation,
  ai_assist_signal,
  publish_scheduled_signals,
  toggle_featured_signal,
  increment_view,
  like_signal,
  unlike_signal,
  bookmark_signal,
  unbookmark_signal,
  share_signal,
};
