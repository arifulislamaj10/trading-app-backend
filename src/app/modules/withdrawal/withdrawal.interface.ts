import { Types } from "mongoose";

export type TWithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "COMPLETED"
  | "REJECTED";

export type TWithdrawalRequest = {
  userId: Types.ObjectId;
  amount: number;
  paymentMethod: string;
  paymentDetails: string;
  status: TWithdrawalStatus;
  adminNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
