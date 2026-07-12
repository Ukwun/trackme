import { NextResponse } from "next/server";
import { checkGeofenceEvents } from "../geofences/events";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { emitRealtimeEvent } from "../../../src/realtime/server";
import { resolveSession } from "../../../src/api/authSession";
import { upsertRuntimeLocation } from "../../../src/api/runtimeStore";

// POST /api/location-update { deviceId, phone, imei, lat, lng, speed?, heading?, battery?, accuracy?, timestamp? }
export async function POST(req: Request) {
  const { userId } = await resolveSession(req);
  const { deviceId, phone, imei, lat, lng, speed, heading, battery, accuracy, timestamp } = await req.json();
  if (!deviceId || lat == null || lng == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const normalizedLat = Number(lat);
  const normalizedLng = Number(lng);
  if (!Number.isFinite(normalizedLat) || !Number.isFinite(normalizedLng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const locationRecord = {
    deviceId,
    phone: phone || null,
    imei: imei || null,
    lat: normalizedLat,
    lng: normalizedLng,
    speed: Number.isFinite(Number(speed)) ? Number(speed) : undefined,
    heading: Number.isFinite(Number(heading)) ? Number(heading) : undefined,
    battery: Number.isFinite(Number(battery)) ? Number(battery) : undefined,
    accuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : undefined,
    timestamp: Number.isFinite(Number(timestamp)) ? Number(timestamp) : Math.floor(Date.now() / 1000),
  };

  // Authorization: allow if session present OR a prior consent exists for this device (one-time consent).
  if (!userId) {
    try {
      const db = await getDb();
      const now = new Date().toISOString();
        const ors: any[] = [{ deviceId }, { imei }, { phone }].filter(Boolean as any);
        // Accept consent if it's permanent (permanent flag or expiresAt === null) or not expired
        const consent = await db.collection("authorized_consents").findOne({
          $and: [
            { granted: true },
            { $or: [ { permanent: true }, { expiresAt: null }, { expiresAt: { $gt: now } } ] },
            { $or: ors },
          ],
        });
      if (!consent) {
        return NextResponse.json({ error: "Consent required for anonymous location updates" }, { status: 403 });
      }
    } catch (e) {
      console.error("Consent verification failed", e);
      return NextResponse.json({ error: "Unable to verify consent" }, { status: 503 });
    }
  }

  // Always emit realtime update so live map remains responsive even if persistence is degraded.
  try {
    upsertRuntimeLocation(locationRecord);
    emitRealtimeEvent("location-update", locationRecord);
  } catch (e) {
    console.error("Runtime emission failed", e);
  }

  let events: Array<{ type: string; geofence: { name: string } }> = [];
  let persisted = false;
  let degraded = false;

  try {
    const db = await getDb();
    await db.collection("location_history").insertOne(locationRecord);
    persisted = true;

    // Geofence event detection
    events = await checkGeofenceEvents(deviceId, [normalizedLat, normalizedLng]);
    for (const evt of events) {
      await logActivity({ action: `geofence:${evt.type}`, meta: { deviceId, geofence: evt.geofence.name } });
      emitRealtimeEvent("geofence-update", {
        deviceId,
        type: evt.type,
        geofence: evt.geofence.name,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Persistence or geofence check failed", err);
    degraded = true;
  }

  return NextResponse.json({ success: true, events, persisted, degraded });
}
