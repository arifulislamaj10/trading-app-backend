import OTPAuth from "otpauth";

/**
 * Generate a random base32 secret for TOTP
 * @returns Base32 encoded secret
 */
export const generateTOTPSecret = (): string => {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
};

/**
 * Generate a TOTP URI for QR code
 * @param email - User's email
 * @param secret - TOTP secret
 * @param issuer - App name/issuer
 * @returns TOTP URI for QR code generation
 */
export const generateTOTPURI = (
  email: string,
  secret: string,
  issuer: string = "MyApp",
): string => {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  return totp.toString();
};

/**
 * Verify a TOTP token
 * @param token - 6-digit TOTP code from user
 * @param secret - User's stored TOTP secret
 * @param window - Acceptable time drift (default: 1, allows ±30 seconds)
 * @returns True if token is valid
 */
export const verifyTOTP = (
  token: string,
  secret: string,
  window: number = 1,
): boolean => {
  try {
    const totp = new OTPAuth.TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    const delta = totp.validate({ token, window });
    return delta !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Generate a backup code for 2FA recovery
 * @returns Random backup code (8 characters)
 */
export const generateBackupCode = (): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  const randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < 8; i++) {
    code += chars[randomValues[i] % chars.length];
  }

  return code;
};

/**
 * Generate multiple backup codes
 * @param count - Number of backup codes to generate
 * @returns Array of backup codes
 */
export const generateBackupCodes = (count: number = 10): string[] => {
  return Array.from({ length: count }, () => generateBackupCode());
};
