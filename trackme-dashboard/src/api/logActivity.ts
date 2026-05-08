import { getDb } from "./db";

export async function logActivity({ userId, action, meta = {} }: { userId: string, action: string, meta?: any }) {
  const db = await getDb();
  await db.collection("activity_log").insertOne({
    userId,
    action,
    meta,
    timestamp: new Date().toISOString(),
  });
}
