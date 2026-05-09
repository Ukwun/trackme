import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
const serverSelectionTimeoutMS = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 12000);
const family = process.env.MONGODB_FAMILY ? Number(process.env.MONGODB_FAMILY) : undefined;
const tls = process.env.MONGODB_TLS ? process.env.MONGODB_TLS === 'true' : true;
const tlsAllowInvalidCertificates = process.env.MONGODB_TLS_ALLOW_INVALID_CERTIFICATES === 'true';

let client: MongoClient;
let db: Db;
let indexesReady: Promise<void> | null = null;

async function ensureIndexes(database: Db) {
  await Promise.all([
    database.collection("activity_logs").createIndexes([
      { key: { userId: 1, timestamp: -1 }, name: "activity_user_time" },
      { key: { action: 1, timestamp: -1 }, name: "activity_action_time" },
    ]),
    database.collection("location_history").createIndexes([
      { key: { deviceId: 1, timestamp: -1 }, name: "location_device_time" },
    ]),
    database.collection("incidents").createIndexes([
      { key: { status: 1, updatedAt: -1 }, name: "incidents_status_updated" },
      { key: { createdBy: 1, createdAt: -1 }, name: "incidents_creator_time" },
      { key: { "timeline.time": -1 }, name: "incidents_timeline_time" },
    ]),
    database.collection("notifications").createIndexes([
      { key: { userId: 1, createdAt: -1 }, name: "notifications_user_time" },
      { key: { deliveryStatus: 1, createdAt: -1 }, name: "notifications_delivery_status" },
    ]),
    database.collection("notification_dead_letters").createIndexes([
      { key: { notificationId: 1, createdAt: -1 }, name: "dead_letters_notification_time" },
      { key: { channel: 1, createdAt: -1 }, name: "dead_letters_channel_time" },
    ]),
  ]);
}

export async function getDb() {
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }
  if (!client || !db) {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS,
      family,
      tls,
      tlsAllowInvalidCertificates,
    });
    await client.connect();
    db = client.db();
    indexesReady = ensureIndexes(db);
  }

  if (indexesReady) {
    await indexesReady;
  }

  return db;
}
