import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app_error";
import { configs } from "../configs";
import { jwtHelpers, JwtPayloadType } from "../utils/JWT";
import { Account_Model } from "../modules/auth/auth.schema";
import { UserRole, UserRoleType } from "../types/role";

const auth = (...roles: UserRoleType[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;

      if (!token || !token.startsWith("Bearer ")) {
        throw new AppError("Authorization header missing or malformed", 401);
      }

      const accessToken = token.split(" ")[1];
      const verifiedUser = await jwtHelpers.verifyToken(
        accessToken,
        configs.jwt.access_token as string,
      );

      if (!roles.length || !roles.includes(verifiedUser.role as UserRoleType)) {
        throw new AppError(
          "You are not authorized to access this resource",
          403,
        );
      }

      // check user
      const isUserExist = await Account_Model.findOne({
        email: verifiedUser?.email,
      }).lean();
      if (!isUserExist) {
        throw new AppError("Account not found", 404);
      }
      if (isUserExist?.accountStatus === "SUSPENDED") {
        throw new AppError("This account is suspended", 401);
      }
      if (isUserExist?.accountStatus === "INACTIVE") {
        throw new AppError("This account is inactive", 401);
      }
      if (isUserExist?.isDeleted) {
        throw new AppError("This account is deleted", 401);
      }

      req.user = verifiedUser;
      next();
    } catch (err) {
      next(err);
    }
  };
};
// this is optional auth middleware
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization;

    if (token && token.startsWith("Bearer ")) {
      const accessToken = token.split(" ")[1];
      try {
        const verifiedUser = await jwtHelpers.verifyToken(
          accessToken,
          configs.jwt.access_token as string,
        );

        // check user
        const isUserExist = await Account_Model.findOne({
          email: verifiedUser?.email,
        }).lean();
        if (
          isUserExist &&
          isUserExist.accountStatus !== "SUSPENDED" &&
          isUserExist.accountStatus !== "INACTIVE" &&
          !isUserExist.isDeleted
        ) {
          req.user = verifiedUser;
        }
      } catch (err) {
        // Ignore JWT errors for optional auth
      }
    }
    next();
  } catch (err) {
    next();
  }
};

export default auth;
