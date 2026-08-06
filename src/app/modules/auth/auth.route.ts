import { Router } from "express";
import { auth_controllers } from "./auth.controller";
import RequestValidator from "../../middlewares/request_validator";
import { authValidations } from "./auth.validation";
import auth from "../../middlewares/auth";
import {
  authLimiter,
  passwordResetLimiter,
} from "../../middlewares/rate_limiter";

const authRoute = Router();

// Public routes
authRoute.post(
  "/register",
  authLimiter,

  RequestValidator(authValidations.register_validation),
  auth_controllers.register_user,
);

authRoute.post(
  "/login",
  authLimiter,
  RequestValidator(authValidations.login_validation),
  auth_controllers.login_user,
);

authRoute.post(
  "/forgot-password",
  passwordResetLimiter,
  RequestValidator(authValidations.forgotPassword),
  auth_controllers.forget_password,
);

authRoute.post(
  "/reset-password",
  passwordResetLimiter,
  RequestValidator(authValidations.resetPassword),
  auth_controllers.reset_password,
);

authRoute.post(
  "/verify-email",
  RequestValidator(authValidations.verifyEmail),
  auth_controllers.verify_email,
);

authRoute.post(
  "/resend-verification",
  RequestValidator(authValidations.forgotPassword),
  auth_controllers.resend_verification_email,
);

authRoute.post(
  "/use-backup-code",
  RequestValidator(authValidations.useBackupCode),
  auth_controllers.use_backup_code,
);

// Refresh token (no auth required)
authRoute.post("/refresh-token", auth_controllers.refresh_token);

// Protected routes (require authentication)
authRoute.get(
  "/me",
  auth("ADMIN", "USER", "MASTER"),
  auth_controllers.get_my_profile,
);

authRoute.post(
  "/logout",
  auth("ADMIN", "USER", "MASTER"),
  auth_controllers.logout_user,
);

authRoute.post(
  "/change-password",
  auth("ADMIN", "USER", "MASTER"),
  RequestValidator(authValidations.changePassword),
  auth_controllers.change_password,
);

// 2FA routes (protected)
authRoute.post(
  "/2fa/setup",
  auth("ADMIN", "USER"),
  RequestValidator(authValidations.enableTwoFactor),
  auth_controllers.setup_two_factor,
);

authRoute.post(
  "/2fa/enable",
  auth("ADMIN", "USER"),
  RequestValidator(authValidations.verifyTwoFactor),
  auth_controllers.enable_two_factor,
);

authRoute.post(
  "/2fa/disable",
  auth("ADMIN", "USER"),
  RequestValidator(authValidations.disableTwoFactor),
  auth_controllers.disable_two_factor,
);

export default authRoute;
