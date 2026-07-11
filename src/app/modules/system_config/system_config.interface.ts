import { Document } from "mongoose";

export type SubscriptionTierKey = "free" | "basic" | "pro" | "master";

export interface IReferralRewardsByTier {
  free: number;
  basic: number;
  pro: number;
  master: number;
}

export interface ISubscriptionTierPlan {
  planId: string;
  name: string;
  price: number;
  interval: "month" | "year";
  trialDays?: number;
  affiliateBonusPercent?: number;
}

export interface ISubscriptionTierInfo {
  tier: SubscriptionTierKey;
  label: string;
  plans: ISubscriptionTierPlan[];
}

export interface IPlatform {
  value: string;
  label: string;
}

export interface ISystemConfig extends Document {
  referralRewardAmount: number; // legacy default / fallback in dollars
  referralRewardsByTier: IReferralRewardsByTier;
  referralCampaignGoal: number;
  platforms: IPlatform[];
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
