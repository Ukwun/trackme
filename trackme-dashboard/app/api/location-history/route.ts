import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";

// GET /api/location-history?deviceId=UNIT_203
export async function GET(req: Request) {
  const url = req.url || "";
  const params = new URL(url, "http://localhost").searchParams;
  const deviceId = params.get("deviceId");
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  const db = await getDb();
  const history = await db
    .collection("location_history")
    .find({ deviceId })
    .sort({ timestamp: -1 })
    .limit(1000)
    .toArray();
  return NextResponse.json({ history });
}
