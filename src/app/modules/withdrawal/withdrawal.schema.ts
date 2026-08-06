import { model, Schema } from "mongoose";
import { TWithdrawalRequest } from "./withdrawal.interface";

const withdrawalRequestSchema = new Schema<TWithdrawalRequest>(
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
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentDetails: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "COMPLETED", "REJECTED"],
      default: "PENDING",
    },
    adminNote: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

withdrawalRequestSchema.index({ userId: 1 });
withdrawalRequestSchema.index({ status: 1 });

export const Withdrawal_Model = model<TWithdrawalRequest>(
  "withdrawal_request",
  withdrawalRequestSchema,
);
