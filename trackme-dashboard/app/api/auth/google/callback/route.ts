import { NextResponse } from "next/server";
import { createAuthCookie, createAuthToken } from "../../../../../src/api/authSession";
import { getDb } from "../../../../../src/api/db";

const STATE_COOKIE_NAME = "tm_google_oauth_state";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  sub?: string;
};

function getBaseUrl(req: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

function getCookie(req: Request, name: string) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === name) return rawValue.join("=");
  }

  return null;
}

function redirectWithError(req: Request, reason: string) {
  return NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(reason)}`, req.url));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = getCookie(req, STATE_COOKIE_NAME);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return redirectWithError(req, "google-not-configured");
  if (!code || !state || !expectedState || state !== expectedState) return redirectWithError(req, "google-state-invalid");

  try {
    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Google token exchange failed", tokenData.error || tokenData.error_description);
      return redirectWithError(req, "google-token-failed");
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileResponse.json()) as GoogleUserInfo;
    if (!profileResponse.ok || !profile.email || profile.email_verified === false) {
      return redirectWithError(req, "google-email-unverified");
    }

    const email = profile.email.trim().toLowerCase();
    const db = await getDb();
    const users = db.collection("users");
    const existing = await users.findOne({ email });
    if (existing?.status === "suspended") return redirectWithError(req, "account-suspended");

    const now = new Date().toISOString();
    const update = {
      $set: {
        email,
        name: profile.name || existing?.name || email.split("@")[0],
        avatarUrl: profile.picture || existing?.avatarUrl || null,
        googleSub: profile.sub || existing?.googleSub || null,
        authProvider: existing?.authProvider === "email" ? "email+google" : "google",
        status: existing?.status || "active",
        lastLoginAt: now,
      },
      $setOnInsert: {
        role: "field_agent",
        createdAt: now,
      },
    };

    await users.updateOne({ email }, update, { upsert: true });
    const user = await users.findOne({ email });
    if (!user?._id) return redirectWithError(req, "google-user-save-failed");

    const role = typeof user.role === "string" ? user.role : "field_agent";
    const token = createAuthToken(String(user._id), role);
    const successUrl = new URL("/", req.url);
    successUrl.searchParams.set("auth", "google");
    const response = NextResponse.redirect(successUrl);
    response.headers.append("Set-Cookie", createAuthCookie(token));
    response.headers.append(
      "Set-Cookie",
      `${STATE_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
    );
    return response;
  } catch (error) {
    console.error("Google authentication failed", error);
    return redirectWithError(req, "google-auth-failed");
  }
}
