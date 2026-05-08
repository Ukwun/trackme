import { NextResponse } from "next/server";
import { checkGeofenceEvents } from "../geofences/events";
import { getDb } from "../../../src/api/db";

// POST /api/location-update { deviceId, lat, lng }
export async function POST(req: Request) {
  const { deviceId, lat, lng } = await req.json();
  if (!deviceId || lat == null || lng == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  // Save location
  const db = await getDb();
  await db.collection("location_history").insertOne({ deviceId, lat, lng, timestamp: Date.now() });

  // Geofence event detection
  const events = await checkGeofenceEvents(deviceId, [lat, lng]);
  for (const evt of events) {
    // Log event
    await db.collection("activity_log").insertOne({
      deviceId,
      event: evt.type,
      geofence: evt.geofence.name,
      time: new Date().toISOString(),
    });
    // Push notification
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Device ${deviceId} entered geofence '${evt.geofence.name}'`, type: "warning" })
    });
    // TODO: Sound alert (client-side)
  }
  return NextResponse.json({ success: true, events });
}
