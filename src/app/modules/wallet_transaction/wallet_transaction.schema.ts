import { model, Schema } from "mongoose";
import { TWalletTransaction } from "./wallet_transaction.interface";

const walletTransactionSchema = new Schema<TWalletTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "account",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["REWARD", "WITHDRAWAL", "REFUND"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REJECTED"],
      default: "COMPLETED",
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

walletTransactionSchema.index({ userId: 1 });
walletTransactionSchema.index({ type: 1 });
walletTransactionSchema.index({ createdAt: -1 });

export const WalletTransaction_Model = model<TWalletTransaction>(
  "wallet_transaction",
  walletTransactionSchema,
);
