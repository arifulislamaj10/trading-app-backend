import { model, Schema, Types } from "mongoose";

export interface IMaster {
  accountId: Types.ObjectId;
  bio: string;
  specialties: string[];
  yearsOfExperience: number;
  isApproved: boolean;
  approvedAt: Date | null;
  approvedBy: Types.ObjectId | null;

  // Reputation metrics
  totalSignals: number;
  winningSignals: number;
  losingSignals: number;
  winRate: number;
  avgPnl: number;
  followerCount: number;

  // Visibility
  isFeatured: boolean;
  displayOrder: number;
}

const masterSchema = new Schema<IMaster>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "account", required: true },
    bio: { type: String, default: "" },
    specialties: { type: [String], default: [] },
    yearsOfExperience: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "account", default: null },

    // Reputation metrics
    totalSignals: { type: Number, default: 0 },
    winningSignals: { type: Number, default: 0 },
    losingSignals: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    avgPnl: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },

    // Visibility
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

// Indexes
masterSchema.index({ accountId: 1 }, { unique: true });
masterSchema.index({ isApproved: 1 });
masterSchema.index({ isFeatured: 1 });
masterSchema.index({ followerCount: -1 }); // For leaderboard
masterSchema.index({ winRate: -1 }); // For leaderboard

export const Master_Model = model<IMaster>("master", masterSchema);
