import { model, Schema, Types } from "mongoose";

export type ContributionActivityType =
  | "view_signal"
  | "like_signal"
  | "bookmark_signal"
  | "share_signal"
  | "create_signal"
  | "comment"
  | "close_signal_profit"
  | "close_signal_loss";

export const CONTRIBUTION_POINTS: Record<ContributionActivityType, number> = {
  view_signal: 1,
  like_signal: 2,
  bookmark_signal: 3,
  share_signal: 5,
  create_signal: 10,
  comment: 5,
  close_signal_profit: 15,
  close_signal_loss: 5,
};

export interface IContribution {
  accountId: Types.ObjectId;
  activityType: ContributionActivityType;
  activityId?: Types.ObjectId; // reference to signal or related entity
  points: number;
  createdAt: Date;
}

const contributionSchema = new Schema<IContribution>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "account", required: true },
    activityType: {
      type: String,
      enum: Object.keys(CONTRIBUTION_POINTS),
      required: true,
    },
    activityId: { type: Schema.Types.ObjectId, default: null },
    points: { type: Number, required: true },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

// Indexes for aggregation queries
contributionSchema.index({ accountId: 1, createdAt: -1 });
contributionSchema.index({ activityType: 1, createdAt: -1 });
contributionSchema.index({ createdAt: -1 });
contributionSchema.index({ accountId: 1, activityType: 1, createdAt: -1 });

export const Contribution_Model = model<IContribution>(
  "contribution",
  contributionSchema,
);
