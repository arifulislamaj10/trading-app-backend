import { model, Schema } from "mongoose";
import { TReferral } from "./referral.interface";

const referralSchema = new Schema<TReferral>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "account",
      required: true,
    },
    inviteeId: {
      type: Schema.Types.ObjectId,
      ref: "account",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "EXPIRED"],
      default: "PENDING",
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
    inviteeSubscriptionTier: {
      type: String,
      enum: ["free", "basic", "pro", "master"],
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

referralSchema.index({ referrerId: 1 });
referralSchema.index({ inviteeId: 1 });
referralSchema.index({ status: 1 });

export const Referral_Model = model<TReferral>("referral", referralSchema);
