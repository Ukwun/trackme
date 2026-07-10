import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import { resolveSession } from "../../../src/api/authSession";
import { getRuntimeLocations } from "../../../src/api/runtimeStore";

// GET /api/location-history?deviceId=UNIT_203
export async function GET(req: Request) {
  const { userId } = await resolveSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = req.url || "";
  const params = new URL(url, "http://localhost").searchParams;
  const deviceId = params.get("deviceId");
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  try {
    const db = await getDb();
    const history = await db
      .collection("location_history")
      .find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(1000)
      .toArray();
    return NextResponse.json({ history, degraded: false });
  } catch (error) {
    console.error("Error loading location history:", error);
    const history = getRuntimeLocations([deviceId], 1000).filter((row) => String(row.deviceId) === deviceId);
    return NextResponse.json({ history, degraded: true });
  }
}
