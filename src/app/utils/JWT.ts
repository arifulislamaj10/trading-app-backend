import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { TokenBlacklist_Model } from "../modules/auth/token_blacklist.schema";

const generateToken = (payload: object, secret: Secret, expiresIn: string) => {
  const token = jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: expiresIn,
  } as SignOptions);

  return token;
};

const verifyToken = async (token: string, secret: Secret) => {
  // Check if token is blacklisted
  const isBlacklisted = await TokenBlacklist_Model.findOne({ token });
  if (isBlacklisted) {
    throw new Error("Token has been revoked");
  }

  return jwt.verify(token, secret) as JwtPayloadType;
};

const blacklistToken = async (token: string, expiresIn: string) => {
  try {
    // Parse expiration time (e.g., "7d", "15m", "1h")
    const timeUnit = expiresIn.slice(-1);
    const timeValue = parseInt(expiresIn.slice(0, -1), 10);

    let milliseconds = 0;
    switch (timeUnit) {
      case "s":
        milliseconds = timeValue * 1000;
        break;
      case "m":
        milliseconds = timeValue * 60 * 1000;
        break;
      case "h":
        milliseconds = timeValue * 60 * 60 * 1000;
        break;
      case "d":
        milliseconds = timeValue * 24 * 60 * 60 * 1000;
        break;
      default:
        milliseconds = timeValue * 1000;
    }

    const expiresAt = new Date(Date.now() + milliseconds);

    await TokenBlacklist_Model.create({
      token,
      expiresAt,
    });
  } catch (error) {
    // Token might already be blacklisted, ignore error
    console.error("Error blacklisting token:", error);
  }
};

export const jwtHelpers = {
  generateToken,
  verifyToken,
  blacklistToken,
};

export type JwtPayloadType = JwtPayload & {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

export type JwtTokenType = string | JwtPayloadType | null;
