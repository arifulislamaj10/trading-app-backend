import { model, Schema } from "mongoose";

export interface ITokenBlacklist {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>(
  {
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

// Unique index on token
tokenBlacklistSchema.index({ token: 1 }, { unique: true });

// TTL index - automatically delete expired tokens (expireAfterSeconds: 0 means expire at exact time)
tokenBlacklistSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, background: true },
);

export const TokenBlacklist_Model = model(
  "token_blacklist",
  tokenBlacklistSchema,
);
