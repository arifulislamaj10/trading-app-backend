import bcrypt from "bcrypt";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a password with a hash
 * @param password - Plain text password
 * @param hashedPassword - Hashed password
 * @returns True if password matches hash
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
