import { model, Schema, Types } from "mongoose";

export interface IFollow {
  followerId: Types.ObjectId;
  masterId: Types.ObjectId;
  notificationsEnabled: boolean;
}

const followSchema = new Schema<IFollow>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "account", required: true },
    masterId: { type: Schema.Types.ObjectId, ref: "account", required: true },
    notificationsEnabled: { type: Boolean, default: true },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

// Unique constraint: a user can follow a master only once
followSchema.index({ followerId: 1, masterId: 1 }, { unique: true });

// Indexes for efficient queries
followSchema.index({ masterId: 1 }); // Get all followers of a master
followSchema.index({ followerId: 1 }); // Get all masters a user follows

export const Follow_Model = model<IFollow>("follow", followSchema);
