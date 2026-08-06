import { Account_Model } from "../modules/auth/auth.schema";
import { AppError } from "./app_error";
import httpStatus from "http-status";

export const isAccountExist = async (email: string, populateField?: string) => {
  let isExistAccount;
  if (populateField) {
    isExistAccount = await Account_Model.findOne({ email })
      .populate(populateField)
      .select("+password");
  } else {
    isExistAccount = await Account_Model.findOne({ email }).select("+password");
  }
  // check account
  if (!isExistAccount) {
    throw new AppError("Invalid email or password", httpStatus.UNAUTHORIZED);
  }
  if (isExistAccount.isDeleted) {
    throw new AppError("This account has been deleted", httpStatus.BAD_REQUEST);
  }
  if (isExistAccount.accountStatus === "INACTIVE") {
    throw new AppError(
      "This account is inactive. Please contact support",
      httpStatus.BAD_REQUEST,
    );
  }
  if (isExistAccount.accountStatus === "SUSPENDED") {
    throw new AppError(
      "This account has been suspended",
      httpStatus.BAD_REQUEST,
    );
  }

  return isExistAccount;
};
