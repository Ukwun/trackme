import { NextResponse } from "next/server";
import { checkGeofenceEvents } from "../geofences/events";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { emitRealtimeEvent } from "../../../src/realtime/server";

// POST /api/location-update { deviceId, lat, lng }
export async function POST(req: Request) {
  const { deviceId, lat, lng } = await req.json();
  if (!deviceId || lat == null || lng == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  // Save location
  const db = await getDb();
  const locationRecord = { deviceId, lat, lng, timestamp: Date.now() };
  await db.collection("location_history").insertOne(locationRecord);
  emitRealtimeEvent("location-update", locationRecord);

  // Geofence event detection
  const events = await checkGeofenceEvents(deviceId, [lat, lng]);
  for (const evt of events) {
    await logActivity({
      action: `geofence:${evt.type}`,
      meta: {
        deviceId,
        geofence: evt.geofence.name,
      },
    });
    emitRealtimeEvent("geofence-update", {
      deviceId,
      type: evt.type,
      geofence: evt.geofence.name,
      timestamp: new Date().toISOString(),
    });
  }
  return NextResponse.json({ success: true, events });
}
