export type TAccount = {
  email: string;
  password: string;
  name: string;
  isDeleted?: boolean;
  accountStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  role?: "USER" | "ADMIN" | "MASTER";
  isVerified?: boolean;
  userProfileUrl?: string;

  // Subscription & Payment
  stripeCustomerId?: string;
  subscriptionStatus?:
    | "none"
    | "trialing"
    | "active"
    | "canceled"
    | "past_due"
    | "expired";
  subscriptionTier?: "free" | "basic" | "pro" | "master";
  subscriptionExpiresAt?: Date;
  trialUsed?: boolean;

  // Email verification
  verificationCode?: string;
  verificationCodeExpires?: Date;

  // Password reset
  resetPasswordCode?: string;
  resetPasswordExpire?: Date;

  // Two-factor authentication
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];

  // Security
  lastPasswordChange?: Date;
  loginAttempts?: number;
  lockedUntil?: Date;
  referralCode?: string;
  referralCodeChanged?: boolean;
  referredBy?: string;
  walletBalance: number;

  // Training & trading access
  trainingCompletedAt?: Date | null;
  tradingUnlocked?: boolean;
  timezone?: string;
  timezoneManuallySet?: boolean;
};

export interface TRegisterPayload {
  name: string;
  email: string;
  password: string;
  referralCode?: string;
  confirmPassword: string;
}

export type TLoginPayload = {
  email: string;
  password: string;
  twoFactorCode?: string;
};

export type TJwtUser = {
  userId: string;
  email: string;
  role: "USER" | "ADMIN" | "MASTER";
};

export type TTwoFASetup = {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
};
