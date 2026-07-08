import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createAuthToken } from "../../../src/api/authSession";
import { getDb } from "../../../src/api/db";
import { rateLimit } from "../../../src/api/rateLimit";

type LocalUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: "field_agent";
  createdAt: string;
};

const localUsers = new Map<string, LocalUser>();

function normalizeNigerianPhone(input: string): string | null {
  const compact = input.replace(/[\s()-]/g, "");
  const local = compact.startsWith("+234") ? `0${compact.slice(4)}` : compact.startsWith("234") ? `0${compact.slice(3)}` : compact;
  if (!/^0[789][01]\d{8}$/.test(local)) return null;
  return `+234${local.slice(1)}`;
}

async function handleWithLocalStore(action: "register" | "login", details: { name: string; phone: string; email: string; password: string }) {
  const { name, phone, email, password } = details;
  if (action === "register") {
    if (localUsers.has(email)) return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
    const user: LocalUser = {
      id: crypto.randomUUID(), name, phone, email,
      password: await bcrypt.hash(password, 12), role: "field_agent", createdAt: new Date().toISOString(),
    };
    localUsers.set(email, user);
    return NextResponse.json({ success: true, mode: "local-dev" }, { status: 201 });
  }
  const user = localUsers.get(email);
  if (!user || !(await bcrypt.compare(password, user.password))) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  return NextResponse.json({ token: createAuthToken(user.id, user.role), role: user.role, name: user.name, email: user.email, mode: "local-dev" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (action !== "register" && action !== "login") return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    const phone = typeof body?.phone === "string" ? normalizeNigerianPhone(body.phone) : null;

    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    if (password.length < 10 || password.length > 128) return NextResponse.json({ error: "Password must be between 10 and 128 characters" }, { status: 400 });
    if (action === "register" && (name.length < 2 || name.length > 100)) return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
    if (action === "register" && !phone) return NextResponse.json({ error: "Enter a valid Nigerian mobile number" }, { status: 400 });
    if (!rateLimit(`auth:${email}`)) return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });

    try {
      const db = await Promise.race([
        getDb(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Authentication database timeout")), 18000)),
      ]);
      const users = db.collection("users");

      if (action === "register") {
        const existing = await users.findOne({ $or: [{ email }, { phone }] });
        if (existing) return NextResponse.json({ error: "An account already exists for this email or phone number" }, { status: 409 });
        await users.insertOne({
          name, phone, email, password: await bcrypt.hash(password, 12), role: "field_agent",
          authProvider: "email", status: "active", createdAt: new Date().toISOString(), lastLoginAt: null,
        });
        return NextResponse.json({ success: true, mode: "mongo" }, { status: 201 });
      }

      const user = await users.findOne({ email });
      if (!user || typeof user.password !== "string" || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
      if (user.status === "suspended") return NextResponse.json({ error: "This account has been suspended" }, { status: 403 });
      const role = typeof user.role === "string" ? user.role : "field_agent";
      await users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date().toISOString() } });
      return NextResponse.json({ token: createAuthToken(String(user._id), role), role, name: user.name || email.split("@")[0], email, mode: "mongo" });
    } catch (databaseError) {
      if (process.env.AUTH_ALLOW_LOCAL_FALLBACK === "true") {
        return handleWithLocalStore(action, { name, phone: phone || "", email, password });
      }
      console.error("Authentication database unavailable", databaseError);
      const message = databaseError instanceof Error ? databaseError.message : "";
      const reason = /querySrv|ENOTFOUND|ECONNREFUSED/i.test(message)
        ? "DATABASE_DNS_OR_NETWORK"
        : /authentication failed|bad auth/i.test(message)
          ? "DATABASE_CREDENTIALS"
          : /timeout|selection/i.test(message)
            ? "DATABASE_TIMEOUT"
            : "DATABASE_UNAVAILABLE";
      return NextResponse.json({ error: "Authentication service is temporarily unavailable", reason }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: "Unexpected authentication error" }, { status: 500 });
  }
}
