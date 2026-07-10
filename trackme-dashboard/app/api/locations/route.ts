import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import { resolveSession } from "../../../src/api/authSession";
import { getRuntimeLocations } from "../../../src/api/runtimeStore";

// GET /api/locations?deviceIds=id1,id2&limit=50
export async function GET(req: Request) {
  const { userId } = await resolveSession(req);
  const { searchParams } = new URL(req.url);
  const deviceIdsParam = searchParams.get("deviceIds");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const deviceIds = (deviceIdsParam || "").split(",").filter(Boolean);

  try {
    const db = await getDb();
    const query = deviceIds.length > 0 ? { deviceId: { $in: deviceIds } } : {};

    const locations = await db.collection("location_history").find(query).sort({ timestamp: -1 }).limit(limit).toArray();

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    const runtimeLocations = getRuntimeLocations(deviceIds, limit);
    return NextResponse.json(runtimeLocations);
  }
}
