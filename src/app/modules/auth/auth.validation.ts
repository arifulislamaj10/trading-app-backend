import { z } from "zod";

// ──────────────────────────────────────────────
// Reusable password validation helpers
// ──────────────────────────────────────────────
const PASSWORD_MIN_LENGTH = 8;

const passwordSchema = z
  .string({ message: "Password is required" })
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  )
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

const passwordsMatch = (data: {
  newPassword?: string;
  confirmNewPassword?: string;
}) => data.newPassword === data.confirmNewPassword;

// ──────────────────────────────────────────────
// Schema definitions
// ──────────────────────────────────────────────

const register_validation = z
  .object({
    name: z
      .string({ message: "Name is required" })
      .min(2, "Name must be at least 2 characters"),
    email: z
      .string({ message: "Email is required" })
      .email("Invalid email format"),
    password: passwordSchema,
    confirmPassword: z.string({ message: "Confirm password is required" }),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const login_validation = z.object({
  email: z
    .string({ message: "Email is required" })
    .email("Invalid email format"),
  password: z.string({ message: "Password is required" }),
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/, "Two-factor code must be 6 digits")
    .optional(),
});

const changePassword = z
  .object({
    oldPassword: z.string({ message: "Old password is required" }),
    newPassword: passwordSchema,
    confirmNewPassword: z.string({
      message: "Confirm new password is required",
    }),
  })
  .refine(passwordsMatch, {
    message: "New password and confirm new password do not match",
    path: ["confirmNewPassword"],
  });

const forgotPassword = z.object({
  email: z
    .string({ message: "Email is required" })
    .email("Invalid email format"),
});

const resetPassword = z
  .object({
    email: z
      .string({ message: "Email is required" })
      .email("Invalid email format"),
    verificationCode: z
      .string({ message: "Verification code is required" })
      .regex(/^\d{6}$/, "Verification code must be 6 digits"),
    newPassword: passwordSchema,
    confirmPassword: z.string({ message: "Confirm password is required" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmPassword"],
  });

const verifyEmail = z.object({
  email: z
    .string({ message: "Email is required" })
    .email("Invalid email format"),
  verificationCode: z
    .string({ message: "Verification code is required" })
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

const verifyTwoFactor = z.object({
  twoFactorCode: z
    .string({ message: "Two-factor code is required" })
    .regex(/^\d{6}$/, "Two-factor code must be 6 digits"),
});

const enableTwoFactor = z.object({
  password: z.string({ message: "Password is required" }),
});

const disableTwoFactor = z.object({
  twoFactorCode: z
    .string({ message: "Two-factor code is required" })
    .regex(/^\d{6}$/, "Two-factor code must be 6 digits"),
});

const useBackupCode = z.object({
  backupCode: z
    .string({ message: "Backup code is required" })
    .min(1, "Backup code is required"),
});

export const authValidations = {
  register_validation,
  login_validation,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  useBackupCode,
};
