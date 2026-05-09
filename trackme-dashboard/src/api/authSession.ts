import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export type AuthSession = {
  userId: string | null;
  role: string | null;
};

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

export function buildUserSelector(userId: string): Record<string, unknown> {
  if (ObjectId.isValid(userId)) {
    return { _id: new ObjectId(userId) };
  }

  return { $or: [{ _id: userId }, { userId }] };
}

export async function resolveSession(req: Request): Promise<AuthSession> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, role: null };
  }

  try {
    const decoded = jwt.verify(authHeader.slice(7), getJwtSecret());
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