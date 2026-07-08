import { AppError } from "../../utils/app_error";
import { TAccount, TLoginPayload, TRegisterPayload, TTwoFASetup } from "./auth.interface";
import { Account_Model } from "./auth.schema";
import httpStatus from "http-status";
import { Document, Types } from "mongoose";
import { jwtHelpers, JwtPayloadType } from "../../utils/JWT";
import { configs } from "../../configs";
import { Secret } from "jsonwebtoken";
import sendMail from "../../utils/mail_sender";
import crypto from "crypto";
import {
  AUTH_ERRORS,
  TOKEN_EXPIRY,
  OTP_CONFIG,
  SECURITY_CONFIG,
  ACCOUNT_STATUS,
} from "../../constants/auth";
import { hashPassword, comparePassword } from "../../utils/password";
import {
  generateTOTPSecret,
  generateTOTPURI,
  verifyTOTP,
  generateBackupCodes,
} from "../../utils/2fa";
import { Referral_Model } from "../referral/referral.schema";
import { referral_services } from "../referral/referral.service";
import mongoose from "mongoose";

type RegisterUserReturnType = Document<unknown, {}, TAccount, {}, TAccount> &
  TAccount & { _id: Types.ObjectId } & { __v: number };

type LoginReturnType = {
  accessToken: string;
  refreshToken: string;
  role: string;
  requiresTwoFactor?: boolean;
};

/**
 * Generate a cryptographically secure OTP
 */
const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Check if account is locked due to too many failed attempts
 */
const checkAccountLockout = (account: TAccount): void => {
  if (account.lockedUntil && account.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((account.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(
      `Account is locked due to too many failed attempts. Try again in ${minutesLeft} minutes`,
      httpStatus.TOO_MANY_REQUESTS
    );
  }
};

/**
 * Handle failed login attempt
 */
const handleFailedLogin = async (email: string): Promise<void> => {
  const account = await Account_Model.findOne({ email }).select('+loginAttempts +lockedUntil');
  
  if (account) {
    const attempts = (account.loginAttempts || 0) + 1;
    
    if (attempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
      await Account_Model.findByIdAndUpdate(account._id, {
        loginAttempts: attempts,
        lockedUntil: new Date(Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION_MS),
      });
    } else {
      await Account_Model.findByIdAndUpdate(account._id, {
        loginAttempts: attempts,
      });
    }
  }
};

/**
 * Reset failed login attempts on successful login
 */
const resetLoginAttempts = async (email: string): Promise<void> => {
  await Account_Model.findOneAndUpdate(
    { email },
    { loginAttempts: 0, lockedUntil: null }
  );
};

/**
 * Register a new user
 */
const register_user_into_db = async (
  payload: TRegisterPayload,
): Promise<RegisterUserReturnType[]> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if account already exists
    const existingAccount = await Account_Model.findOne({ email: payload.email }).session(session);

    if (existingAccount) {
      throw new AppError(AUTH_ERRORS.ACCOUNT_EXISTS, httpStatus.BAD_REQUEST);
    }

    // Hash password
    const hashedPassword = await hashPassword(payload.password);

    // Generate unique referral code for the new user
    const referralCode = await referral_services.generateReferralCode();

    // Check if referred by someone
    let referredBy: Types.ObjectId | undefined;
    if (payload.referralCode) {
      const referrer = await Account_Model.findOne({ referralCode: payload.referralCode }).session(session);
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    // Create account with name, email, hashed password, and referral info
    const accountPayload: Partial<TAccount> = {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      referralCode,
      referredBy: referredBy as any,
    };

    const newAccount = await Account_Model.create([accountPayload], { session });

    // If referred by someone, create a referral record
    if (referredBy) {
      await Referral_Model.create([{
        referrerId: referredBy,
        inviteeId: newAccount[0]._id,
        status: 'PENDING',
        rewardAmount: 0, // Rewards might be calculated later upon subscription/completion
      }], { session });
    }

    // Generate verification code
    const verificationCode = generateOTP();
    const verificationCodeExpires = new Date(Date.now() + OTP_CONFIG.EXPIRY_MS);

    await Account_Model.findByIdAndUpdate(
      newAccount[0]._id,
      { verificationCode, verificationCodeExpires },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Send verification email (non-blocking)
    sendMail({
      to: payload.email,
      subject: 'Verify Your Email',
      textBody: 'Your email verification code',
      name: payload.name,
      htmlBody: `
        <p>Thanks for creating an account with us! Please use the following code to verify your email:</p>
        <h2 style="text-align: center; color: #4CAF50; font-size: 32px; margin: 20px 0;">${verificationCode}</h2>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      `,
    });

    return newAccount;

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Login user with email, password, and optional 2FA
 */
const login_user_from_db = async (payload: TLoginPayload): Promise<LoginReturnType> => {
  try {
    // Find account with sensitive fields
    const account = await Account_Model.findOne({ email: payload.email })
      .select('+password +twoFactorEnabled +twoFactorSecret +loginAttempts +lockedUntil');
    
    if (!account) {
      await handleFailedLogin(payload.email);
      throw new AppError(AUTH_ERRORS.INVALID_CREDENTIALS, httpStatus.UNAUTHORIZED);
    }

    // Check account lockout
    checkAccountLockout(account);

    // Check account status
    if (account.isDeleted) {
      throw new AppError(AUTH_ERRORS.ACCOUNT_DELETED, httpStatus.BAD_REQUEST);
    }
    if (account.accountStatus === ACCOUNT_STATUS.INACTIVE) {
      throw new AppError(AUTH_ERRORS.ACCOUNT_INACTIVE, httpStatus.BAD_REQUEST);
    }
    if (account.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
      throw new AppError(AUTH_ERRORS.ACCOUNT_SUSPENDED, httpStatus.BAD_REQUEST);
    }

    // Verify password
    const isPasswordMatch = await comparePassword(payload.password, account.password);
    if (!isPasswordMatch) {
      await handleFailedLogin(payload.email);
      throw new AppError(AUTH_ERRORS.INVALID_CREDENTIALS, httpStatus.UNAUTHORIZED);
    }

    // Check if 2FA is enabled
    if (account.twoFactorEnabled) {
      if (!payload.twoFactorCode) {
        throw new AppError(AUTH_ERRORS.TWO_FA_REQUIRED, httpStatus.UNAUTHORIZED, {
          requiresTwoFactor: true,
        });
      }
      
      const isTOTPValid = verifyTOTP(payload.twoFactorCode, account.twoFactorSecret!);
      if (!isTOTPValid) {
        await handleFailedLogin(payload.email);
        throw new AppError(AUTH_ERRORS.TWO_FA_INVALID, httpStatus.UNAUTHORIZED);
      }
    }

    // Reset login attempts on successful login
    await resetLoginAttempts(payload.email);

    // Generate tokens with userId, email, and role
    const accessToken = jwtHelpers.generateToken(
      { userId: account._id.toString(), email: account.email, role: account.role || 'USER' },
      configs.jwt.access_token as Secret,
      TOKEN_EXPIRY.ACCESS
    );

    const refreshToken = jwtHelpers.generateToken(
      { userId: account._id.toString(), email: account.email, role: account.role || 'USER' },
      configs.jwt.refresh_token as Secret,
      TOKEN_EXPIRY.REFRESH
    );

    return {
      accessToken,
      refreshToken,
      role: account.role || 'USER',
      requiresTwoFactor: account.twoFactorEnabled,
    };
    
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(AUTH_ERRORS.INVALID_CREDENTIALS, httpStatus.UNAUTHORIZED);
  }
};

/**
 * Get current user profile
 */
const get_my_profile_from_db = async (email: string): Promise<Omit<TAccount, 'password'>> => {
  const account = await Account_Model.findOne({ email }).select('-password');

  if (!account) {
    throw new AppError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  const roleLabels: Record<string, string> = {
    USER: 'User',
    MASTER: 'Master Trader',
    ADMIN: 'Admin',
  };

  const profile = account.toObject();
  return {
    ...profile,
    status: account.accountStatus,
    has2FA: account.twoFactorEnabled ?? false,
    isEmailVerified: account.isVerified ?? false,
    roleLabel: account.role ? roleLabels[account.role] || account.role : 'User',
    isMasterTrader: account.role === 'MASTER',
  } as unknown as Omit<TAccount, 'password'>;
};

/**
 * Refresh access token with token rotation
 */
const refresh_token_from_db = async (token: string): Promise<{ accessToken: string; refreshToken: string }> => {
  let decodedData: JwtPayloadType;
  
  try {
    decodedData = await jwtHelpers.verifyToken(token, configs.jwt.refresh_token as Secret);
  } catch (err) {
    throw new AppError(AUTH_ERRORS.INVALID_TOKEN, httpStatus.UNAUTHORIZED);
  }

  const userData = await Account_Model.findOne({
    email: decodedData.email,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    isDeleted: false,
  });

  if (!userData) {
    throw new AppError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  await jwtHelpers.blacklistToken(token, TOKEN_EXPIRY.REFRESH);

  const accessToken = jwtHelpers.generateToken(
    { userId: userData._id.toString(), email: userData.email, role: userData.role || 'USER' },
    configs.jwt.access_token as Secret,
    TOKEN_EXPIRY.ACCESS
  );

  const refreshToken = jwtHelpers.generateToken(
    { userId: userData._id.toString(), email: userData.email, role: userData.role || 'USER' },
    configs.jwt.refresh_token as Secret,
    TOKEN_EXPIRY.REFRESH
  );

  return { accessToken, refreshToken };
};

/**
 * Change password for authenticated user
 */
const change_password_from_db = async (
  user: JwtPayloadType,
  payload: { oldPassword: string; newPassword: string; confirmNewPassword: string },
): Promise<string> => {
  const account = await Account_Model.findOne({ email: user.email }).select('+password');

  if (!account) {
    throw new AppError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  const isCorrectPassword = await comparePassword(payload.oldPassword, account.password);
  if (!isCorrectPassword) {
    throw new AppError(AUTH_ERRORS.INVALID_OLD_PASSWORD, httpStatus.UNAUTHORIZED);
  }

  if (payload.newPassword !== payload.confirmNewPassword) {
    throw new AppError(AUTH_ERRORS.PASSWORD_MISMATCH, httpStatus.BAD_REQUEST);
  }

  if (payload.oldPassword === payload.newPassword) {
    throw new AppError("New password must be different from your current password", httpStatus.BAD_REQUEST);
  }

  const hashedPassword = await hashPassword(payload.newPassword);

  await Account_Model.findOneAndUpdate(
    { email: account.email },
    {
      password: hashedPassword,
      lastPasswordChange: new Date(),
    }
  );

  return AUTH_ERRORS.PASSWORD_CHANGED;
};

/**
 * Request password reset - sends OTP to email
 */
const forget_password_from_db = async (email: string): Promise<string> => {
  const account = await Account_Model.findOne({ email });

  if (!account) {
    // Don't reveal if account exists
    return AUTH_ERRORS.RESET_EMAIL_SENT;
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MS);

  await Account_Model.findByIdAndUpdate(account._id, {
    resetPasswordCode: otp,
    resetPasswordExpire: expiresAt,
  });

  // Send password reset email (non-blocking)
  sendMail({
    to: email,
    subject: 'Password Reset Request',
    textBody: 'Your password reset code',
    htmlBody: `
      <p>You requested a password reset. Use the following code to reset your password:</p>
      <h2 style="text-align: center; color: #4CAF50; font-size: 32px; margin: 20px 0;">${otp}</h2>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });

  return AUTH_ERRORS.RESET_EMAIL_SENT;
};

/**
 * Reset password using OTP
 */
const reset_password_from_db = async (
  email: string,
  verificationCode: string,
  newPassword: string,
): Promise<string> => {
  const account = await Account_Model.findOne({ email }).select('+resetPasswordCode +resetPasswordExpire');

  if (!account) {
    throw new AppError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  // Verify OTP
  if (
    !account.resetPasswordCode ||
    !account.resetPasswordExpire ||
    account.resetPasswordCode !== verificationCode ||
    account.resetPasswordExpire < new Date()
  ) {
    throw new AppError(AUTH_ERRORS.INVALID_OTP, httpStatus.BAD_REQUEST);
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and clear reset fields
  await Account_Model.findOneAndUpdate(
    { email: account.email },
    {
      password: hashedPassword,
      lastPasswordChange: new Date(),
      resetPasswordCode: undefined,
      resetPasswordExpire: undefined,
    }
  );

  return AUTH_ERRORS.PASSWORD_RESET;
};

/**
 * Verify email with OTP
 */
const verify_email_from_db = async (
  email: string,
  verificationCode: string,
): Promise<string> => {
  const account = await Account_Model.findOne({ email }).select('+verificationCode +verificationCodeExpires');

  if (!account) {
    throw new AppError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  // Verify code
  if (
    !account.verificationCode ||
    !account.verificationCodeExpires ||
    account.verificationCode !== verificationCode ||
    account.verificationCodeExpires < new Date()
  ) {
    throw new AppError(AUTH_ERRORS.INVALID_OTP, httpStatus.BAD_REQUEST);
  }

  // Mark account as verified
  await Account_Model.findOneAndUpdate(
    { email: account.email },
    {
      isVerified: true,
      verificationCode: undefined,
      verificationCodeExpires: undefined,
    }
  );

  return AUTH_ERRORS.ACCOUNT_VERIFIED;
};

/**
 * Resend verification email
 */
const resend_verification_email_from_db = async (email: string): Promise<string> => {
  const account = await Account_Model.findOne({ email });

  if (!account) {
    throw new AppError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  if (account.isVerified) {
    throw new AppError('Account is already verified', httpStatus.BAD_REQUEST);
  }

  // Generate new verification code
  const verificationCode = generateOTP();
  const verificationCodeExpires = new Date(Date.now() + OTP_CONFIG.EXPIRY_MS);

  await Account_Model.findOneAndUpdate(
    { email: account.email },
    { verificationCode, verificationCodeExpires }
  );

  // Send verification email (non-blocking)
  sendMail({
    to: email,
    subject: 'Verify Your Email',
    textBody: 'Your email verification code',
    htmlBody: `
      <p>Your new verification code is:</p>
      <h2 style="text-align: center; color: #4CAF50; font-size: 32px; margin: 20px 0;">${verificationCode}</h2>
      <p>This code will expire in 10 minutes.</p>
    `,
  });

  return AUTH_ERRORS.VERIFICATION_EMAIL_SENT;
};

/**
 * Setup 2FA for user
 */
const setup_two_factor_from_db = async (email: string, password: string): Promise<TTwoFASetup> => {
  const account = await Account_Model.findOne({ email }).select('+password');

  if (!account) {
    throw new AppError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  // Verify password
  const isPasswordMatch = await comparePassword(password, account.password);
  if (!isPasswordMatch) {
    throw new AppError(AUTH_ERRORS.INVALID_PASSWORD, httpStatus.UNAUTHORIZED);
  }

  if (account.twoFactorEnabled) {
    throw new AppError(AUTH_ERRORS.TWO_FA_ALREADY_ENABLED, httpStatus.BAD_REQUEST);
  }

  // Generate 2FA secret
  const secret = generateTOTPSecret();
  const qrCodeUrl = generateTOTPURI(email, secret);
  const backupCodes = generateBackupCodes(10);

  // Store secret (don't enable yet)
  await Account_Model.findOneAndUpdate(
    { email: account.email },
    {
      twoFactorSecret: secret,
      twoFactorBackupCodes: backupCodes,
    }
  );

  return {
    secret,
    qrCodeUrl,
    backupCodes,
  };
};

/**
 * Enable 2FA after verification
 */
const enable_two_factor_from_db = async (
  email: string,
  twoFactorCode: string,
): Promise<string> => {
  const account = await Account_Model.findOne({ email }).select('+twoFactorSecret');

  if (!account) {
    throw new AppError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  if (!account.twoFactorSecret) {
    throw new AppError('Please setup 2FA first', httpStatus.BAD_REQUEST);
  }

  if (account.twoFactorEnabled) {
    throw new AppError(AUTH_ERRORS.TWO_FA_ALREADY_ENABLED, httpStatus.BAD_REQUEST);
  }

  // Verify TOTP
  const isValid = verifyTOTP(twoFactorCode, account.twoFactorSecret);
  if (!isValid) {
    throw new AppError(AUTH_ERRORS.TWO_FA_INVALID, httpStatus.BAD_REQUEST);
  }

  // Enable 2FA
  await Account_Model.findOneAndUpdate(
    { email: account.email },
    { twoFactorEnabled: true }
  );

  return AUTH_ERRORS.TWO_FA_ENABLED_SUCCESS;
};

/**
 * Disable 2FA
 */
const disable_two_factor_from_db = async (
  email: string,
  twoFactorCode: string,
): Promise<string> => {
  const account = await Account_Model.findOne({ email }).select('+twoFactorSecret +twoFactorEnabled');

  if (!account) {
    throw new AppError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  if (!account.twoFactorEnabled) {
    throw new AppError(AUTH_ERRORS.TWO_FA_NOT_ENABLED, httpStatus.BAD_REQUEST);
  }

  // Verify TOTP
  const isValid = verifyTOTP(twoFactorCode, account.twoFactorSecret!);
  if (!isValid) {
    throw new AppError(AUTH_ERRORS.TWO_FA_INVALID, httpStatus.BAD_REQUEST);
  }

  // Disable 2FA
  await Account_Model.findOneAndUpdate(
    { email: account.email },
    {
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorBackupCodes: undefined,
    }
  );

  return AUTH_ERRORS.TWO_FA_DISABLED_SUCCESS;
};

/**
 * Use backup code for 2FA login
 */
const use_backup_code_from_db = async (
  email: string,
  backupCode: string,
): Promise<LoginReturnType> => {
  const account = await Account_Model.findOne({ email })
    .select('+password +twoFactorEnabled +twoFactorSecret +twoFactorBackupCodes');

  if (!account) {
    throw new AppError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, httpStatus.NOT_FOUND);
  }

  if (!account.twoFactorEnabled) {
    throw new AppError(AUTH_ERRORS.TWO_FA_NOT_ENABLED, httpStatus.BAD_REQUEST);
  }

  // Check if backup code is valid
  const isValidCode = account.twoFactorBackupCodes?.includes(backupCode);
  if (!isValidCode) {
    throw new AppError(AUTH_ERRORS.TWO_FA_INVALID, httpStatus.UNAUTHORIZED);
  }

  // Remove used backup code
  const remainingCodes = account.twoFactorBackupCodes?.filter(code => code !== backupCode);
  await Account_Model.findOneAndUpdate(
    { email: account.email },
    { twoFactorBackupCodes: remainingCodes }
  );

  // Generate tokens with userId, email, and role
  const accessToken = jwtHelpers.generateToken(
    { userId: account._id.toString(), email: account.email, role: account.role || 'USER' },
    configs.jwt.access_token as Secret,
    TOKEN_EXPIRY.ACCESS
  );

  const refreshToken = jwtHelpers.generateToken(
    { userId: account._id.toString(), email: account.email, role: account.role || 'USER' },
    configs.jwt.refresh_token as Secret,
    TOKEN_EXPIRY.REFRESH
  );

  return {
    accessToken,
    refreshToken,
    role: account.role || 'USER',
    requiresTwoFactor: true,
  };
};

/**
 * Logout user - blacklist tokens
 */
const logout_user_from_db = async (
  accessToken: string,
  refreshToken?: string,
): Promise<string> => {
  const blacklistTasks = [jwtHelpers.blacklistToken(accessToken, TOKEN_EXPIRY.ACCESS)];

  if (refreshToken) {
    blacklistTasks.push(jwtHelpers.blacklistToken(refreshToken, TOKEN_EXPIRY.REFRESH));
  }

  await Promise.all(blacklistTasks);

  return AUTH_ERRORS.LOGOUT_SUCCESS;
};

export const auth_services = {
  register_user_into_db,
  login_user_from_db,
  get_my_profile_from_db,
  refresh_token_from_db,
  change_password_from_db,
  forget_password_from_db,
  reset_password_from_db,
  verify_email_from_db,
  resend_verification_email_from_db,
  setup_two_factor_from_db,
  enable_two_factor_from_db,
  disable_two_factor_from_db,
  use_backup_code_from_db,
  logout_user_from_db,
};
