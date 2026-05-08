import { getDb } from "./db";

export async function logActivity(userId: string, action: string, meta: any = {}) {
  const db = await getDb();
  await db.collection("activity_logs").insertOne({ userId, action, meta, timestamp: new Date().toISOString() });
}

export async function getUserActivity(userId: string) {
  const db = await getDb();
  return db.collection("activity_logs").find({ userId }).sort({ timestamp: -1 }).toArray();
}
