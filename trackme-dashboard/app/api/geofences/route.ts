import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";

  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, center, radius } = body;
  if (!name || !center || !radius) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const db = await getDb();
  await db.collection("geofences").insertOne({ userId, name, center, radius, createdAt: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const geofences = await db.collection("geofences").find({ userId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ geofences });
}
