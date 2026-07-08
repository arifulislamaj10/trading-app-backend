import { model, Schema, Types } from 'mongoose';

export type SignalEngagementType = 'like' | 'bookmark';

export interface ISignalEngagement {
  accountId: Types.ObjectId;
  signalId: Types.ObjectId;
  type: SignalEngagementType;
}

const signalEngagementSchema = new Schema<ISignalEngagement>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'account', required: true },
    signalId: { type: Schema.Types.ObjectId, ref: 'signal', required: true },
    type: { type: String, enum: ['like', 'bookmark'], required: true },
  },
  { versionKey: false, timestamps: true }
);

signalEngagementSchema.index({ accountId: 1, signalId: 1, type: 1 }, { unique: true });
signalEngagementSchema.index({ signalId: 1, type: 1 });

export const SignalEngagement_Model = model<ISignalEngagement>(
  'signal_engagement',
  signalEngagementSchema
);
