import { model, Schema, Types } from 'mongoose';

export type CopiedTradeStatus = 'pending' | 'completed' | 'failed';
export type TradeOutcome = 'win' | 'loss' | 'breakeven';

export interface ICopiedTrade {
  userId: Types.ObjectId;
  signalId: Types.ObjectId;
  masterId: Types.ObjectId;

  status: CopiedTradeStatus;

  // Copy intent
  copiedAt: Date;

  // Trade log (filled when user reports result)
  entryPrice: number | null;
  stopLoss: number | null;
  exitPrice: number | null;
  targetPrice: number | null;
  lotSize: number | null;
  resultPnl: number | null;
  pnlUnit: 'usd' | 'percent';
  outcome: TradeOutcome | null;
  notes: string;
  screenshotUrl: string;
  externalPlatform: string;

  // Timestamps
  loggedAt: Date | null;
}

const copiedTradeSchema = new Schema<ICopiedTrade>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'account', required: true },
    signalId: { type: Schema.Types.ObjectId, ref: 'signal', required: true },
    masterId: { type: Schema.Types.ObjectId, ref: 'account', required: true },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },

    // Copy intent
    copiedAt: { type: Date, default: Date.now },

    // Trade log
    entryPrice: { type: Number, default: null },
    stopLoss: { type: Number, default: null },
    exitPrice: { type: Number, default: null },
    targetPrice: { type: Number, default: null },
    lotSize: { type: Number, default: null },
    resultPnl: { type: Number, default: null },
    pnlUnit: { type: String, enum: ['usd', 'percent'], default: 'usd' },
    outcome: { type: String, enum: ['win', 'loss', 'breakeven'], default: null },
    notes: { type: String, default: '' },
    screenshotUrl: { type: String, default: '' },
    externalPlatform: { type: String, default: '' },

    // Timestamps
    loggedAt: { type: Date, default: null },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

// Indexes for optimized queries
copiedTradeSchema.index({ userId: 1, signalId: 1 }, { unique: true });
copiedTradeSchema.index({ userId: 1, status: 1 });
copiedTradeSchema.index({ signalId: 1 });
copiedTradeSchema.index({ masterId: 1, status: 1 });
copiedTradeSchema.index({ userId: 1, createdAt: -1 });

export const Copied_Trade_Model = model<ICopiedTrade>('copied_trade', copiedTradeSchema);
