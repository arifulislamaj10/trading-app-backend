import { Types } from "mongoose";

export type TTransactionType = "REWARD" | "WITHDRAWAL" | "REFUND";
export type TTransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REJECTED";

export type TWalletTransaction = {
  userId: Types.ObjectId;
  amount: number;
  type: TTransactionType;
  status: TTransactionStatus;
  referenceId?: Types.ObjectId; // ID of Referral or WithdrawalRequest
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
