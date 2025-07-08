import jwt from "jsonwebtoken";
import { config } from "../config/environment";
import { UserRole, AuthTokens } from "../types";

export function generateTokens(
  userId: string,
  email: string,
  role: UserRole
): AuthTokens {
  const payload = { userId, email, role };

  const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: "1d" });
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: "7d",
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600 * 24 * 7,
  };
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, config.jwt.secret);
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1] || null;
}

export function generateSessionId(): string {
  return Date.now().toString() + Math.random().toString(36);
}
