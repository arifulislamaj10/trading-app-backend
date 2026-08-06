import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catch_async";
import { AppError } from "../utils/app_error";
import httpStatus from "http-status";
import { Account_Model } from "../modules/auth/auth.schema";
import { User_Badge_Model } from "../modules/badge/badge.schema";

/**
 * Gatekeeper: only users who completed training (or ADMIN/MASTER) may copy/log trades.
 */
export const requireTradingAccess = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const accountId = req.user!.userId;

    const account = await Account_Model.findById(accountId).select(
      "role tradingUnlocked trainingCompletedAt",
    );

    if (!account) {
      throw new AppError("Account not found", httpStatus.NOT_FOUND);
    }

    if (account.role === "ADMIN" || account.role === "MASTER") {
      return next();
    }

    if (account.tradingUnlocked) {
      return next();
    }

    const trainingBadge = await User_Badge_Model.findOne({
      accountId,
      badgeKey: "training_complete",
    });

    if (trainingBadge) {
      return next();
    }

    throw new AppError(
      "Complete platform training to unlock trading. Visit the Training section to earn your badge.",
      httpStatus.FORBIDDEN,
    );
  },
);

export default requireTradingAccess;
