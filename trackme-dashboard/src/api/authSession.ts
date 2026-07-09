import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export type AuthSession = {
  userId: string | null;
  role: string | null;
};

export const AUTH_COOKIE_NAME = "tm_auth_session";
const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }

  return "dev_secret";
}

export function createAuthToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, getJwtSecret(), { expiresIn: "7d" });
}

export function createAuthCookie(token: string) {
  return [
    `${AUTH_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${AUTH_MAX_AGE_SECONDS}`,
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearAuthCookie() {
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function getCookieValue(req: Request, name: string) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === name) return rawValue.join("=");
  }

  return null;
}

export function getAuthTokenFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return getCookieValue(req, AUTH_COOKIE_NAME);
}

export function buildUserSelector(userId: string): Record<string, unknown> {
  if (ObjectId.isValid(userId)) {
    return { _id: new ObjectId(userId) };
  }

  return { $or: [{ _id: userId }, { userId }] };
}

export async function resolveSession(req: Request): Promise<AuthSession> {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    return { userId: null, role: null };
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || typeof decoded === "string") {
      return { userId: null, role: null };
    }
    const payload = decoded as jwt.JwtPayload;
    return {
      userId: payload.userId ? String(payload.userId) : null,
      role: payload.role ? String(payload.role) : null,
    };
  } catch {
    return { userId: null, role: null };
  }
}
