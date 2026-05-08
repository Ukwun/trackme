import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import speakeasy from "speakeasy";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function verifyToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  try {
    return jwt.verify(auth.replace("Bearer ", ""), JWT_SECRET);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const user = verifyToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, token } = await req.json();
  const db = await getDb();

  if (action === "setup") {
    const secret = speakeasy.generateSecret();
    await db.collection("users").updateOne({ _id: user.userId }, { $set: { twoFASecret: secret.base32 } });
    return NextResponse.json({ otpauth_url: secret.otpauth_url, base32: secret.base32 });
  }

  if (action === "verify") {
    const dbUser = await db.collection("users").findOne({ _id: user.userId });
    if (!dbUser?.twoFASecret) return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
    const verified = speakeasy.totp.verify({
      secret: dbUser.twoFASecret,
      encoding: "base32",
      token,
    });
    if (!verified) return NextResponse.json({ error: "Invalid 2FA token" }, { status: 401 });
    await db.collection("users").updateOne({ _id: user.userId }, { $set: { twoFAVerified: true } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
