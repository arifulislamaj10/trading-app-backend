import { Schema, model } from "mongoose";
import { ISystemConfig } from "./system_config.interface";

const tierRewardDefaults = {
  free: 0,
  basic: 3,
  pro: 5,
  master: 10,
};

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    referralRewardAmount: {
      type: Number,
      required: true,
      default: 5,
    },
    referralRewardsByTier: {
      type: {
        free: { type: Number, default: tierRewardDefaults.free },
        basic: { type: Number, default: tierRewardDefaults.basic },
        pro: { type: Number, default: tierRewardDefaults.pro },
        master: { type: Number, default: tierRewardDefaults.master },
      },
      default: () => ({ ...tierRewardDefaults }),
    },
    referralCampaignGoal: {
      type: Number,
      default: 1000,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const SystemConfig_Model = model<ISystemConfig>(
  "system_config",
  systemConfigSchema,
);
