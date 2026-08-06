import { Schema, model, Types } from "mongoose";

export interface IComment {
  signalId: Types.ObjectId;
  userId: Types.ObjectId;
  message: string;
  isDeleted: boolean;
}

const commentSchema = new Schema<IComment>(
  {
    signalId: {
      type: Schema.Types.ObjectId,
      ref: "signal",
      required: [true, "Signal ID is required"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "account",
      required: [true, "User ID is required"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      maxlength: [500, "Message cannot exceed 500 characters"],
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Performance: Compound index for retrieving comments for a signal sorted by latest first
commentSchema.index({ signalId: 1, createdAt: -1 });

// Index for soft delete queries
commentSchema.index({ isDeleted: 1 });

export const Comment_Model = model<IComment>("comment", commentSchema);
