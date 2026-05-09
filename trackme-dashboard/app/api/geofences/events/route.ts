import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../src/api/db";
import { resolveSession } from "../../../../src/api/authSession";
import { hasPermission } from "../../../../src/api/permissions";
import { rateLimit } from "../../../../src/api/rateLimit";

type Point = [number, number];

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineMeters(a: Point, b: Point): number {
  const earth = 6371000;
  const lat1 = toRadians(a[0]);
  const lng1 = toRadians(a[1]);
  const lat2 = toRadians(b[0]);
  const lng2 = toRadians(b[1]);
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earth * Math.asin(Math.sqrt(h));
}

export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "geofence:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(`${userId}:geofences:events:post`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { deviceId, location } = await req.json();
  if (!deviceId || !Array.isArray(location) || location.length !== 2) {
    return NextResponse.json({ error: "deviceId and location [lat, lng] are required" }, { status: 400 });
  }

  const point: Point = [Number(location[0]), Number(location[1])];
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    return NextResponse.json({ error: "Invalid location values" }, { status: 400 });
  }

  const db = await getDb();
  const geofences = await db.collection("geofences").find({ userId }).toArray();

  const triggered = geofences
    .filter((g) => Array.isArray(g.center) && Number.isFinite(g.radius))
    .filter((g) => haversineMeters(point, [Number(g.center[0]), Number(g.center[1])]) <= Number(g.radius))
    .map((g) => ({
      geofenceId: String(g._id),
      name: g.name,
      type: "enter",
      deviceId,
      location: point,
      radius: g.radius,
      center: g.center,
    }));

  return NextResponse.json({ triggered });
}
