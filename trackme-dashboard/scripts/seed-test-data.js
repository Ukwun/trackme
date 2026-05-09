#!/usr/bin/env node

/**
 * Seed Script for TrackMe Test Data
 * 
 * Creates test users for all roles with consistent, reproducible data.
 * Used by CI/CD pipeline before running Playwright tests.
 * 
 * Usage:
 *   node scripts/seed-test-data.js [--db-url=mongodb://...]
 */

const mongodb = require("mongodb");

const TEST_USERS = [
  { email: "admin@test.local", password: "AdminTest123!", role: "super_admin" },
  { email: "control@test.local", password: "ControlTest123!", role: "control_room" },
  { email: "dispatch@test.local", password: "DispatchTest123!", role: "dispatcher" },
  { email: "patrol@test.local", password: "PatrolTest123!", role: "patrol_officer" },
  { email: "analyst@test.local", password: "AnalystTest123!", role: "analyst" },
  { email: "field@test.local", password: "FieldTest123!", role: "field_agent" },
];

const TEST_DEVICES = [
  { deviceId: "SEED-DEVICE-001", ownerId: "admin@test.local", latitude: 40.7128, longitude: -74.006, speed: 0, heading: 0, battery: 100 },
  { deviceId: "SEED-DEVICE-002", ownerId: "control@test.local", latitude: 40.7260, longitude: -74.0029, speed: 0, heading: 0, battery: 85 },
  { deviceId: "SEED-DEVICE-003", ownerId: "dispatch@test.local", latitude: 40.7489, longitude: -73.968, speed: 0, heading: 0, battery: 72 },
];

const TEST_INCIDENTS = [
  {
    incidentId: "SEED-INC-001",
    title: "Test Incident 1",
    description: "Seed incident for testing",
    severity: "high",
    status: "open",
    createdBy: "admin@test.local",
    createdAt: new Date(),
  },
];

const TEST_GEOFENCES = [
  {
    geofenceId: "SEED-GEO-001",
    name: "Test Geofence 1",
    latitude: 40.7128,
    longitude: -74.006,
    radius: 500,
    createdBy: "control@test.local",
    createdAt: new Date(),
  },
];

async function seedDatabase() {
  const dbUrl = process.argv.find((arg) => arg.startsWith("--db-url="))?.split("=")[1] || 
    process.env.MONGO_URL || 
    process.env.DATABASE_URL ||
    "mongodb://localhost:27017/trackme";

  console.log(`[SEED] Connecting to ${dbUrl}`);
  
  const client = new mongodb.MongoClient(dbUrl, { 
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log("[SEED] ✓ Connected to MongoDB");

    const db = client.db("trackme");

    // Create collections if not exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    if (!collectionNames.includes("users")) {
      await db.createCollection("users");
      console.log("[SEED] ✓ Created users collection");
    }

    if (!collectionNames.includes("devices")) {
      await db.createCollection("devices");
      console.log("[SEED] ✓ Created devices collection");
    }

    if (!collectionNames.includes("incidents")) {
      await db.createCollection("incidents");
      console.log("[SEED] ✓ Created incidents collection");
    }

    if (!collectionNames.includes("geofences")) {
      await db.createCollection("geofences");
      console.log("[SEED] ✓ Created geofences collection");
    }

    // Seed users
    const usersCollection = db.collection("users");
    for (const user of TEST_USERS) {
      const existing = await usersCollection.findOne({ email: user.email });
      if (!existing) {
        await usersCollection.insertOne({
          ...user,
          createdAt: new Date(),
          lastLogin: null,
          status: "active",
        });
        console.log(`[SEED] ✓ Created user: ${user.email} (${user.role})`);
      } else {
        console.log(`[SEED] ℹ User already exists: ${user.email}`);
      }
    }

    // Seed devices
    const devicesCollection = db.collection("devices");
    for (const device of TEST_DEVICES) {
      const existing = await devicesCollection.findOne({ deviceId: device.deviceId });
      if (!existing) {
        await devicesCollection.insertOne({
          ...device,
          registeredAt: new Date(),
          sharedWith: [],
        });
        console.log(`[SEED] ✓ Created device: ${device.deviceId}`);
      } else {
        console.log(`[SEED] ℹ Device already exists: ${device.deviceId}`);
      }
    }

    // Seed incidents
    const incidentsCollection = db.collection("incidents");
    for (const incident of TEST_INCIDENTS) {
      const existing = await incidentsCollection.findOne({ incidentId: incident.incidentId });
      if (!existing) {
        await incidentsCollection.insertOne({
          ...incident,
          assignedUnits: [],
          timeline: [{ action: "created", timestamp: new Date(), actor: incident.createdBy }],
        });
        console.log(`[SEED] ✓ Created incident: ${incident.incidentId}`);
      } else {
        console.log(`[SEED] ℹ Incident already exists: ${incident.incidentId}`);
      }
    }

    // Seed geofences
    const geofencesCollection = db.collection("geofences");
    for (const geofence of TEST_GEOFENCES) {
      const existing = await geofencesCollection.findOne({ geofenceId: geofence.geofenceId });
      if (!existing) {
        await geofencesCollection.insertOne(geofence);
        console.log(`[SEED] ✓ Created geofence: ${geofence.geofenceId}`);
      } else {
        console.log(`[SEED] ℹ Geofence already exists: ${geofence.geofenceId}`);
      }
    }

    console.log("[SEED] ✓ Database seeded successfully");
  } catch (error) {
    console.error("[SEED] ✗ Seed failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedDatabase();
