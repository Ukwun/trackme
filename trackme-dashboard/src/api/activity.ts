import { getDb } from "./db";

export async function writeActivityLog({
  userId = null,
  action,
  meta = {},
  timestamp = new Date().toISOString(),
}: {
  userId?: string | null;
  action: string;
  meta?: any;
  timestamp?: string;
}) {
  const db = await getDb();
  await db.collection("activity_logs").insertOne({ userId, action, meta, timestamp });
}

export async function logActivity(userId: string, action: string, meta: any = {}) {
  await writeActivityLog({ userId, action, meta });
}

export async function getUserActivity(userId: string) {
  const db = await getDb();
  return db.collection("activity_logs").find({ userId }).sort({ timestamp: -1 }).toArray();
}
