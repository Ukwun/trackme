import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import speakeasy from "speakeasy";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

import type { JwtPayload } from "jsonwebtoken";
function verifyToken(req: Request): JwtPayload | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  try {
    const decoded = jwt.verify(auth.replace("Bearer ", ""), JWT_SECRET);
    if (typeof decoded === "string") return null;
    return decoded as JwtPayload;
  } catch {
    return null;
  }
}

function getUserQuery(userId: unknown): Record<string, any> {
  const id = String(userId || "");
  if (ObjectId.isValid(id)) {
    return { _id: new ObjectId(id) };
  }
  return { _id: id };
}

export async function GET(req: Request) {
  const user = verifyToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const dbUser = await db.collection("users").findOne(getUserQuery(user.userId));
  const enabled = Boolean(dbUser?.twoFASecret && dbUser?.twoFAVerified);
  return NextResponse.json({ enabled });
}

export async function POST(req: Request) {
  const user = verifyToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, token } = await req.json();
  const db = await getDb();
  const userQuery = getUserQuery(user.userId);

  if (action === "setup") {
    const secret = speakeasy.generateSecret();
    await db.collection("users").updateOne(userQuery, { $set: { twoFASecret: secret.base32 } });
    return NextResponse.json({ otpauth_url: secret.otpauth_url, base32: secret.base32 });
  }

  if (action === "verify") {
    const dbUser = await db.collection("users").findOne(userQuery);
    if (!dbUser?.twoFASecret) return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
    const verified = speakeasy.totp.verify({
      secret: dbUser.twoFASecret,
      encoding: "base32",
      token,
    });
    if (!verified) return NextResponse.json({ error: "Invalid 2FA token" }, { status: 401 });
    await db.collection("users").updateOne(userQuery, { $set: { twoFAVerified: true } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
