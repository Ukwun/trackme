import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import { resolveSession } from "../../../src/api/authSession";

export async function GET(req: Request) {
  const { userId } = await resolveSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDb();
    const pref = await db.collection("preferences").findOne({ userId });
    return NextResponse.json({ preferences: pref || {}, degraded: false });
  } catch (error) {
    console.error("Error loading preferences:", error);
    return NextResponse.json({ preferences: {}, degraded: true, error: "Preferences temporarily unavailable" });
  }
}

export async function POST(req: Request) {
  const { userId } = await resolveSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  try {
    const db = await getDb();
    await db.collection("preferences").updateOne(
      { userId },
      { $set: body },
      { upsert: true }
    );
    return NextResponse.json({ success: true, degraded: false });
  } catch (error) {
    console.error("Error saving preferences:", error);
    return NextResponse.json({ success: false, degraded: true, error: "Unable to save preferences right now" }, { status: 503 });
  }
}
