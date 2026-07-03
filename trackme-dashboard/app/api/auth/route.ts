import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import bcrypt from "bcryptjs";
import { createAuthToken } from "../../../src/api/authSession";
import { rateLimit } from "../../../src/api/rateLimit";

type LocalUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
};

const localUsers = new Map<string, LocalUser>();

function getRegistrationRole(email: string): string {
  const prefix = email.split("@")[0].toLowerCase();
  const roleMap: Record<string, string> = {
    super_admin: "super_admin",
    admin: "super_admin",
    control_room: "control_room",
    dispatcher: "dispatcher",
    patrol_officer: "patrol_officer",
    patrol: "patrol_officer",
    analyst: "analyst",
    field_agent: "field_agent",
    field: "field_agent",
  };
  return roleMap[prefix] ?? "field_agent";
}

async function handleWithLocalStore(
  action: string,
  email: string,
  password: string
) {
  if (action === "register") {
    const existing = localUsers.get(email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: "User exists" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    const user: LocalUser = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      email,
      password: hash,
      role: getRegistrationRole(email),
      createdAt: new Date().toISOString(),
    };
    localUsers.set(email.toLowerCase(), user);
    return NextResponse.json({ success: true, mode: "local-dev" });
  }

  if (action === "login") {
    const user = localUsers.get(email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createAuthToken(user.id, user.role);
    return NextResponse.json({ token, role: user.role, mode: "local-dev" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// User roles: super_admin, control_room, dispatcher, patrol_officer, analyst, field_agent

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const action = body?.action;
    const email = body?.email;
    const password = body?.password;
    if (action !== "register" && action !== "login") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: "Password must be between 10 and 128 characters" }, { status: 400 });
    }
    if (!rateLimit(`auth:${normalizedEmail}`)) {
      return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }

    try {
      // Use Promise.race to timeout DB connection after 3 seconds for auth
      const dbPromise = getDb();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth DB timeout')), 3000)
      );
      const db = await Promise.race([dbPromise, timeoutPromise]) as Awaited<ReturnType<typeof getDb>>;

      if (action === "register") {
        const existing = await db.collection("users").findOne({ email: normalizedEmail });
        if (existing) return NextResponse.json({ error: "User exists" }, { status: 400 });
        const hash = await bcrypt.hash(password, 10);
        const user = {
          email: normalizedEmail,
          password: hash,
          role: "field_agent",
          createdAt: new Date().toISOString(),
        };
        await db.collection("users").insertOne(user);
        return NextResponse.json({ success: true, mode: "mongo" });
      }

      const user = await db.collection("users").findOne({ email: normalizedEmail });
      if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      const token = createAuthToken(String(user._id), user.role);
      return NextResponse.json({ token, role: user.role, mode: "mongo" });
    } catch (dbError) {
      const message = dbError instanceof Error ? dbError.message : String(dbError);
      const allowLocalFallback = process.env.AUTH_ALLOW_LOCAL_FALLBACK === "true";
      if (allowLocalFallback) {
        return handleWithLocalStore(action, normalizedEmail, password);
      }
      return NextResponse.json({
        error: "Authentication backend unavailable",
        ...(process.env.NODE_ENV === "development" ? { details: message } : {}),
      }, { status: 503 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
