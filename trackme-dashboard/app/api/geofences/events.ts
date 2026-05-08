import { getDb } from "../../../src/api/db";

// Utility: Point in Polygon (Ray Casting)
function pointInPolygon(point: [number, number], polygon: [number, number][]) {
  let [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let [xi, yi] = polygon[i];
    let [xj, yj] = polygon[j];
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 0.00001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Geofence event detection
export async function checkGeofenceEvents(deviceId: string, location: [number, number]) {
  const db = await getDb();
  const geofences = await db.collection("geofences").find({}).toArray();
  let triggered: any[] = [];
  for (const geo of geofences) {
    if (geo.coordinates && Array.isArray(geo.coordinates[0])) {
      if (pointInPolygon(location, geo.coordinates[0])) {
        triggered.push({ type: "enter", geofence: geo });
      }
    }
  }
  return triggered;
}
