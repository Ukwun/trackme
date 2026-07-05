import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDb } from "../../../../src/api/db";
import { createAuthToken } from "../../../../src/api/authSession";

export async function POST() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.primaryEmailAddress;
  const email = primaryEmail?.emailAddress?.trim().toLowerCase();
  if (!clerkUser || !email) {
    return NextResponse.json({ error: "A verified email address is required" }, { status: 400 });
  }
  if (primaryEmail?.verification?.status !== "verified") {
    return NextResponse.json({ error: "Verify your email address before accessing TrackMe" }, { status: 403 });
  }

  try {
    const db = await getDb();
    const users = db.collection("users");
    const existing = await users.findOne({ $or: [{ clerkUserId }, { email }] });

    if (existing) {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            clerkUserId,
            email,
            name: clerkUser.fullName || clerkUser.firstName || email.split("@")[0],
            imageUrl: clerkUser.imageUrl,
            authProvider: clerkUser.externalAccounts.length > 0 ? "oauth" : "email",
            lastLoginAt: new Date().toISOString(),
          },
        }
      );
      const role = typeof existing.role === "string" ? existing.role : "field_agent";
      return NextResponse.json({ token: createAuthToken(String(existing._id), role), role });
    }

    const result = await users.insertOne({
      clerkUserId,
      email,
      name: clerkUser.fullName || clerkUser.firstName || email.split("@")[0],
      imageUrl: clerkUser.imageUrl,
      authProvider: clerkUser.externalAccounts.length > 0 ? "oauth" : "email",
      role: "field_agent",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
    return NextResponse.json({ token: createAuthToken(String(result.insertedId), "field_agent"), role: "field_agent" });
  } catch (error) {
    console.error("Clerk identity sync failed", error);
    return NextResponse.json({ error: "Identity service is temporarily unavailable" }, { status: 503 });
  }
}
