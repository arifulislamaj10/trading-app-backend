import { Withdrawal_Model } from "./withdrawal.schema";
import { Account_Model } from "../auth/auth.schema";
import { WalletTransaction_Model } from "../wallet_transaction/wallet_transaction.schema";
import { AppError } from "../../utils/app_error";
import httpStatus from "http-status";
import mongoose from "mongoose";
import { TWithdrawalRequest, TWithdrawalStatus } from "./withdrawal.interface";
import { notification_services } from "../notification/notification.service";

export const WITHDRAWAL_STATUS_DEFINITIONS = {
  PENDING: "User submitted a withdrawal request. Balance is not deducted yet.",
  APPROVED:
    "Admin approved the request. Amount is deducted from the user's wallet and a wallet transaction is created.",
  COMPLETED:
    "Admin confirmed the payout was sent externally (e.g. bank/PayPal transfer completed). No additional balance change.",
  REJECTED:
    "Request was rejected. If previously approved, the deducted amount is refunded to the user's wallet.",
};

const notifyWithdrawalStatus = async (
  userId: string,
  status: TWithdrawalStatus,
  amount: number,
  adminNote?: string
) => {
  const statusMessages: Record<TWithdrawalStatus, { title: string; message: string }> = {
    PENDING: {
      title: "Withdrawal Request Submitted",
      message: `Your withdrawal request for $${amount.toFixed(2)} has been submitted and is pending review.`,
    },
    APPROVED: {
      title: "Withdrawal Approved",
      message: `Your withdrawal of $${amount.toFixed(2)} has been approved. The amount has been deducted from your wallet.`,
    },
    COMPLETED: {
      title: "Withdrawal Completed",
      message: `Your withdrawal of $${amount.toFixed(2)} has been marked complete. Funds should arrive per your payment method.`,
    },
    REJECTED: {
      title: "Withdrawal Rejected",
      message: `Your withdrawal request for $${amount.toFixed(2)} was rejected.${adminNote ? ` Reason: ${adminNote}` : ""}`,
    },
  };

  const content = statusMessages[status];
  if (!content) return;

  await notification_services.create_notification({
    accountId: userId,
    type: "system_announcement",
    title: content.title,
    message: content.message,
    link: "/wallet",
    data: { withdrawalStatus: status, amount },
  });
};

const create_withdrawal_request_in_db = async (userId: string, payload: Partial<TWithdrawalRequest>) => {
  const account = await Account_Model.findById(userId);
  if (!account) {
    throw new AppError("Account not found", httpStatus.NOT_FOUND);
  }

  const { amount } = payload;
  if (!amount || amount <= 0) {
    throw new AppError("Invalid withdrawal amount", httpStatus.BAD_REQUEST);
  }

  if (account.walletBalance < amount) {
    throw new AppError("Insufficient wallet balance", httpStatus.BAD_REQUEST);
  }

  // Check for existing pending request
  const existingPendingRequest = await Withdrawal_Model.findOne({
    userId,
    status: "PENDING",
  });

  if (existingPendingRequest) {
    throw new AppError(
      "You already have a pending withdrawal request. Please wait until it is processed.",
      httpStatus.BAD_REQUEST
    );
  }

  // Minimum withdrawal threshold (e.g., $10 or $1)
  const MIN_WITHDRAWAL = 1; // $1.00
  if (amount < MIN_WITHDRAWAL) {
    throw new AppError(`Minimum withdrawal amount is $${MIN_WITHDRAWAL}`, httpStatus.BAD_REQUEST);
  }

  const result = await Withdrawal_Model.create({
    userId,
    ...payload,
    status: "PENDING",
  });

  await notifyWithdrawalStatus(userId, "PENDING", amount);

  return result;
};

const get_my_withdrawals_from_db = async (userId: string, query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const result = await Withdrawal_Model.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Withdrawal_Model.countDocuments({ userId });

  return {
    data: result,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const get_all_withdrawals_from_db = async (query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filters: any = {};
  if (query.status) {
    filters.status = query.status;
  }

  const result = await Withdrawal_Model.find(filters)
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Withdrawal_Model.countDocuments(filters);

  return {
    data: result,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    statusDefinitions: WITHDRAWAL_STATUS_DEFINITIONS,
  };
};

const update_withdrawal_status_in_db = async (id: string, payload: { status: TWithdrawalStatus; adminNote?: string }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const withdrawalRequest = await Withdrawal_Model.findById(id).session(session);
    if (!withdrawalRequest) {
      throw new AppError("Withdrawal request not found", httpStatus.NOT_FOUND);
    }

    if (withdrawalRequest.status === "COMPLETED" || withdrawalRequest.status === "REJECTED") {
      throw new AppError(`Request already ${withdrawalRequest.status.toLowerCase()}`, httpStatus.BAD_REQUEST);
    }

    const shouldDeduct =
      withdrawalRequest.status === "PENDING" &&
      (payload.status === "APPROVED" || payload.status === "COMPLETED");

    const shouldRefund =
      withdrawalRequest.status === "APPROVED" && payload.status === "REJECTED";

    if (shouldDeduct) {
      const account = await Account_Model.findById(withdrawalRequest.userId).session(session);
      if (!account) {
        throw new AppError("Account not found", httpStatus.NOT_FOUND);
      }

      if (account.walletBalance < withdrawalRequest.amount) {
        throw new AppError("Insufficient balance to approve this request", httpStatus.BAD_REQUEST);
      }

      await Account_Model.findByIdAndUpdate(
        withdrawalRequest.userId,
        { $inc: { walletBalance: -withdrawalRequest.amount } },
        { session }
      );

      await WalletTransaction_Model.create([{
        userId: withdrawalRequest.userId,
        amount: withdrawalRequest.amount,
        type: "WITHDRAWAL",
        status: "COMPLETED",
        referenceId: withdrawalRequest._id,
        description: "Wallet withdrawal",
      }], { session });
    }

    if (shouldRefund) {
      await Account_Model.findByIdAndUpdate(
        withdrawalRequest.userId,
        { $inc: { walletBalance: withdrawalRequest.amount } },
        { session }
      );

      await WalletTransaction_Model.create([{
        userId: withdrawalRequest.userId,
        amount: withdrawalRequest.amount,
        type: "REFUND",
        status: "COMPLETED",
        referenceId: withdrawalRequest._id,
        description: "Withdrawal rejection refund",
      }], { session });
    }
    
    const result = await Withdrawal_Model.findByIdAndUpdate(
      id,
      { status: payload.status, adminNote: payload.adminNote },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    await notifyWithdrawalStatus(
      withdrawalRequest.userId.toString(),
      payload.status,
      withdrawalRequest.amount,
      payload.adminNote
    );

    return result;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const withdrawal_services = {
  create_withdrawal_request_in_db,
  get_my_withdrawals_from_db,
  get_all_withdrawals_from_db,
  update_withdrawal_status_in_db,
  WITHDRAWAL_STATUS_DEFINITIONS,
};
