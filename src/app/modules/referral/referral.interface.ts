import { Types } from "mongoose";

export type TReferral = {
  referrerId: Types.ObjectId;
  inviteeId: Types.ObjectId;
  status: "PENDING" | "COMPLETED" | "EXPIRED";
  rewardAmount: number;
  inviteeSubscriptionTier?: "free" | "basic" | "pro" | "master";
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
