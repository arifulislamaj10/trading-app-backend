import { model, Schema, Types } from 'mongoose';

export type SignalType = 'long' | 'short';
export type SignalStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'canceled' | 'published' | 'completed' | 'cancelled' | 'won' | 'lost';
/** Final trade outcome for a Master signal (orthogonal to workflow/publish status). */
export type SignalOutcome = 'pending' | 'hit_target' | 'stopped_out' | 'cancelled';
export type AssetType = 'forex' | 'crypto' | 'stocks' | 'indices' | 'commodities' | 'futures' | 'options' | 'etfs';
export type Timeframe = 'm1' | 'm5' | 'm15' | 'm30' | 'h1' | 'h4' | 'd1' | 'w1' | 'mn1';
export type PublishType = 'instant' | 'scheduled';

export type WorkflowStatus =
  | 'draft'
  | 'ai_pending'
  | 'ai_passed'
  | 'ai_failed'
  | 'mt_pending'
  | 'active'
  | 'rejected';

export interface IAiValidation {
  status: 'pass' | 'fail' | 'review';
  score: number;
  summary: string;
  risks: string[];
  suggestedEdits?: string[];
  validatedAt: Date;
  model: string;
  rawResponse?: string;
}

export interface IMtReview {
  confirmedAt: Date | null;
  confirmedBy: Types.ObjectId | null;
  rejectedAt?: Date | null;
  rejectionReason?: string;
}

export interface ISignal {
  authorId: Types.ObjectId;
  title: string;
  description: string;
  assetType: AssetType;
  symbol: string;
  signalType: SignalType;
  timeframe: Timeframe;

  // Entry details
  entryPrice: number;
  entryNotes: string;

  // Exit targets
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  takeProfit3: number | null;
  isPremium: boolean;

  // Signal state
  status: SignalStatus;
  publishType: PublishType;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  isFeatured: boolean;

  // Performance tracking
  /** pending until closed/canceled; then hit_target | stopped_out | cancelled */
  outcome: SignalOutcome;
  resultPnl: number | null;
  pnlUnit: 'usd' | 'percent';
  closedAt: Date | null;
  closeNotes: string;

  // Engagement counters
  viewCount: number;
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  copierCount: number;

  // Metadata
  tags: string[];
  externalChartUrl: string;
  videoUrl: string;

  // AI-assisted workflow
  workflowStatus: WorkflowStatus;
  aiValidation: IAiValidation | null;
  mtReview: IMtReview | null;
}

const signalSchema = new Schema<ISignal>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'account', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    assetType: {
      type: String,
      enum: ['forex', 'crypto', 'stocks', 'indices', 'commodities', 'futures', 'options', 'etfs'],
      required: true,
    },
    symbol: { type: String, required: true },
    signalType: { type: String, enum: ['long', 'short'], required: true },
    timeframe: {
      type: String,
      enum: ['m1', 'm5', 'm15', 'm30', 'h1', 'h4', 'd1', 'w1', 'mn1'],
      required: true,
    },

    // Entry details
    entryPrice: { type: Number, required: true },
    entryNotes: { type: String, default: '' },

    // Exit targets
    stopLoss: { type: Number, default: null },
    takeProfit1: { type: Number, default: null },
    takeProfit2: { type: Number, default: null },
    takeProfit3: { type: Number, default: null },

    // Signal state
    status: { 
      type: String, 
      enum: ['draft', 'scheduled', 'active', 'expired', 'canceled', 'published', 'completed', 'cancelled', 'won', 'lost'], 
      default: 'active' 
    },
    publishType: { 
      type: String, 
      enum: ['instant', 'scheduled'], 
      default: 'instant' 
    },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    isFeatured: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },

    // Performance tracking
    outcome: {
      type: String,
      enum: ['pending', 'hit_target', 'stopped_out', 'cancelled'],
      default: 'pending',
    },
    resultPnl: { type: Number, default: null },
    pnlUnit: {
      type: String,
      enum: ['usd', 'percent'],
      default: 'usd',
    },
    closedAt: { type: Date, default: null },
    closeNotes: { type: String, default: '' },

    // Engagement counters
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    copierCount: { type: Number, default: 0 },

    // Metadata
    tags: { type: [String], default: [] },
    externalChartUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },

    workflowStatus: {
      type: String,
      enum: ['draft', 'ai_pending', 'ai_passed', 'ai_failed', 'mt_pending', 'active', 'rejected'],
      default: 'active',
    },
    aiValidation: { type: Schema.Types.Mixed, default: null },
    mtReview: { type: Schema.Types.Mixed, default: null },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

// Indexes for optimized queries
signalSchema.index({ authorId: 1, status: 1 });
signalSchema.index({ authorId: 1, createdAt: -1 });
signalSchema.index({ assetType: 1, status: 1 });
signalSchema.index({ signalType: 1, status: 1 });
signalSchema.index({ isPremium: 1 });
signalSchema.index({ isFeatured: 1 });
signalSchema.index({ createdAt: -1 });
signalSchema.index({ status: 1, publishedAt: -1 });
signalSchema.index({ status: 1, scheduledAt: 1 });
signalSchema.index({ copierCount: -1 });
signalSchema.index({ workflowStatus: 1, authorId: 1 });
signalSchema.index({ authorId: 1, workflowStatus: 1, createdAt: -1 });
signalSchema.index({ outcome: 1, status: 1 });

export const Signal_Model = model<ISignal>('signal', signalSchema);
