import { model, Schema, Types } from "mongoose";
import type { BadgeKey, BadgeRole } from "./badge.constants";

export interface IBadge {
  key: BadgeKey;
  name: string;
  description: string;
  iconKey: string;
  iconUrl: string;
  role: BadgeRole;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export interface IUserBadge {
  accountId: Types.ObjectId;
  badgeKey: BadgeKey;
  earnedAt: Date;
}

const badgeSchema = new Schema<IBadge>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    iconKey: { type: String, required: true },
    iconUrl: { type: String, default: "" },
    role: { type: String, enum: ["USER", "MASTER"], required: true },
    category: { type: String, default: "general" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true },
);

badgeSchema.index({ role: 1, sortOrder: 1 });

const userBadgeSchema = new Schema<IUserBadge>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "account", required: true },
    badgeKey: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
  },
  { versionKey: false, timestamps: false },
);

userBadgeSchema.index({ accountId: 1, badgeKey: 1 }, { unique: true });
userBadgeSchema.index({ accountId: 1, earnedAt: -1 });

export const Badge_Model = model<IBadge>("badge", badgeSchema);
export const User_Badge_Model = model<IUserBadge>(
  "user_badge",
  userBadgeSchema,
);
