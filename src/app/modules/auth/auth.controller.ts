import { configs } from "../../configs";
import { AppError } from "../../utils/app_error";
import catchAsync from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import { auth_services } from "./auth.service";
import httpStatus from "http-status";
import { Request, Response } from "express";
import { AUTH_ERRORS } from "../../constants/auth";

//
const register_user = catchAsync(async (req: Request, res: Response) => {
  const result = await auth_services.register_user_into_db(req.body);

  manageResponse(res, {
    success: true,
    message: AUTH_ERRORS.ACCOUNT_CREATED,
    statusCode: httpStatus.CREATED,
    data: result,
  });
});

const login_user = catchAsync(async (req: Request, res: Response) => {
  const result = await auth_services.login_user_from_db(req.body);

  res.cookie("refreshToken", result.refreshToken, {
    secure: configs.env === "production",
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: AUTH_ERRORS.LOGIN_SUCCESS,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      role: result.role,
      requiresTwoFactor: result.requiresTwoFactor,
    },
  });
});

const get_my_profile = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.user!;
  const result = await auth_services.get_my_profile_from_db(email);

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully",
    data: result,
  });
});

const refresh_token = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    throw new AppError("Refresh token required", httpStatus.UNAUTHORIZED);
  }

  const result = await auth_services.refresh_token_from_db(refreshToken);

  res.cookie("refreshToken", result.refreshToken, {
    secure: configs.env === "production",
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Token refreshed successfully",
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const change_password = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await auth_services.change_password_from_db(user, req.body);

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result,
    data: null,
  });
});

const forget_password = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await auth_services.forget_password_from_db(email);

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result,
    data: null,
  });
});

const reset_password = catchAsync(async (req: Request, res: Response) => {
  const { email, verificationCode, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new AppError(AUTH_ERRORS.PASSWORD_MISMATCH, httpStatus.BAD_REQUEST);
  }

  const result = await auth_services.reset_password_from_db(
    email,
    verificationCode,
    newPassword,
  );

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result,
    data: null,
  });
});

const verify_email = catchAsync(async (req: Request, res: Response) => {
  const { email, verificationCode } = req.body;
  const result = await auth_services.verify_email_from_db(
    email,
    verificationCode,
  );

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result,
    data: null,
  });
});

const resend_verification_email = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await auth_services.resend_verification_email_from_db(email);

    manageResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result,
      data: null,
    });
  },
);

const logout_user = catchAsync(async (req: Request, res: Response) => {
  const accessToken = req.headers.authorization?.split(" ")[1];
  const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;

  if (!accessToken) {
    throw new AppError(
      "Access token required for logout",
      httpStatus.BAD_REQUEST,
    );
  }

  const result = await auth_services.logout_user_from_db(
    accessToken,
    refreshToken,
  );

  // Clear cookie
  res.clearCookie("refreshToken");

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result,
    data: null,
  });
});

// 2FA endpoints
const setup_two_factor = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.user!;
  const { password } = req.body;

  const result = await auth_services.setup_two_factor_from_db(email, password);

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "2FA setup initiated. Please verify the code to enable.",
    data: result,
  });
});

const enable_two_factor = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.user!;
  const { twoFactorCode } = req.body;

  const result = await auth_services.enable_two_factor_from_db(
    email,
    twoFactorCode,
  );

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result,
    data: null,
  });
});

const disable_two_factor = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.user!;
  const { twoFactorCode } = req.body;

  const result = await auth_services.disable_two_factor_from_db(
    email,
    twoFactorCode,
  );

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result,
    data: null,
  });
});

const use_backup_code = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const { backupCode } = req.body;

  const result = await auth_services.use_backup_code_from_db(email, backupCode);

  res.cookie("refreshToken", result.refreshToken, {
    secure: configs.env === "production",
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful with backup code",
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      role: result.role,
    },
  });
});

export const auth_controllers = {
  register_user,
  login_user,
  get_my_profile,
  refresh_token,
  change_password,
  forget_password,
  reset_password,
  verify_email,
  resend_verification_email,
  logout_user,
  setup_two_factor,
  enable_two_factor,
  disable_two_factor,
  use_backup_code,
};
