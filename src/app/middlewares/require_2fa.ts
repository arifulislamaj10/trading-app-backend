import { Request, Response, NextFunction } from "express";
import { verifyTOTP } from "../utils/2fa";
import { Account_Model } from "../modules/auth/auth.schema";
import { AppError } from "../utils/app_error";
import httpStatus from "http-status";

/**
 * Middleware that requires a valid 2FA code in the request body.
 * Only enforced if the authenticated user has 2FA enabled.
 * Use this on sensitive endpoints like role changes, master approvals, etc.
 *
 * Expects: req.body.twoFactorCode
 * Skips validation if user has 2FA disabled (backward compatible).
 */
export const require2FA = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError("Authentication required", httpStatus.UNAUTHORIZED);
  }

  const account = await Account_Model.findById(userId).select(
    "twoFactorEnabled twoFactorSecret",
  );

  if (!account) {
    throw new AppError("Account not found", httpStatus.NOT_FOUND);
  }

  // If 2FA is not enabled, skip verification (allow request through)
  if (!account.twoFactorEnabled) {
    return next();
  }

  // 2FA is enabled — require and validate the code
  const { twoFactorCode } = req.body;

  if (!twoFactorCode || typeof twoFactorCode !== "string") {
    throw new AppError(
      "Two-factor authentication code is required",
      httpStatus.BAD_REQUEST,
    );
  }

  if (!account.twoFactorSecret) {
    throw new AppError(
      "2FA is enabled but no secret found. Please disable and re-enable 2FA.",
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const isValid = verifyTOTP(twoFactorCode, account.twoFactorSecret);

  if (!isValid) {
    throw new AppError(
      "Invalid two-factor authentication code",
      httpStatus.UNAUTHORIZED,
    );
  }

  next();
};
