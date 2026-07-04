import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
const serverSelectionTimeoutMS = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000); // Reduced from 12s for faster failures
const family = process.env.MONGODB_FAMILY ? Number(process.env.MONGODB_FAMILY) : undefined;
const tls = process.env.MONGODB_TLS ? process.env.MONGODB_TLS === 'true' : true;
const tlsAllowInvalidCertificates = process.env.MONGODB_TLS_ALLOW_INVALID_CERTIFICATES === 'true';

let client: MongoClient | null = null;
let db: Db | null = null;
let indexesReady: Promise<void> | null = null;
let connectionError: Error | null = null;
let lastConnectionAttempt = 0;

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
    database.collection("authorized_cases").createIndexes([
      { key: { caseNumber: 1 }, name: "cases_number_unique", unique: true },
      { key: { warrantNumber: 1 }, name: "cases_warrant_unique", unique: true },
      { key: { status: 1, expiresAt: 1 }, name: "cases_status_expiry" },
      { key: { subjectType: 1, subjectIdentifier: 1 }, name: "cases_subject" },
    ]),
  ]);
}

export async function getDb() {
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  // Return existing connection if available
  if (client && db) {
    try {
      if (indexesReady) {
        await indexesReady;
      }
      return db;
    } catch (err) {
      // Connection gone bad, reset it
      client = null;
      db = null;
      connectionError = null;
    }
  }

  // Avoid thundering herd: if connection failed recently, wait before retrying
  const now = Date.now();
  if (connectionError && lastConnectionAttempt > 0 && now - lastConnectionAttempt < 3000) {
    throw connectionError;
  }

  lastConnectionAttempt = now;

  // Attempt connection with retry
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS,
        family,
        tls,
        tlsAllowInvalidCertificates,
        socketTimeoutMS: 5000,
        retryWrites: true,
      });
      await client.connect();
      db = client.db();
      connectionError = null;
      indexesReady = ensureIndexes(db);
      if (indexesReady) {
        await indexesReady;
      }
      return db;
    } catch (err) {
      lastErr = err as Error;
      client = null;
      db = null;
      // On retry, wait a bit before next attempt
      if (attempt === 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // All retries failed
  connectionError = lastErr || new Error('MongoDB connection failed');
  throw connectionError;
}
