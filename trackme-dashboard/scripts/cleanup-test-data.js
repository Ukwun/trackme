#!/usr/bin/env node

/**
 * Cleanup Script for TrackMe Test Data
 * 
 * Removes test data created by seed script.
 * Used by CI/CD pipeline after running Playwright tests to ensure clean state.
 * 
 * Usage:
 *   node scripts/cleanup-test-data.js [--db-url=mongodb://...]
 */

const mongodb = require("mongodb");

const TEST_EMAILS = [
  "admin@test.local",
  "control@test.local",
  "dispatch@test.local",
  "patrol@test.local",
  "analyst@test.local",
  "field@test.local",
];

const TEST_DEVICE_IDS = ["SEED-DEVICE-001", "SEED-DEVICE-002", "SEED-DEVICE-003"];
const TEST_INCIDENT_IDS = ["SEED-INC-001"];
const TEST_GEOFENCE_IDS = ["SEED-GEO-001"];

async function cleanupDatabase() {
  const dbUrl = process.argv.find((arg) => arg.startsWith("--db-url="))?.split("=")[1] ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL ||
    "mongodb://localhost:27017/trackme";

  console.log(`[CLEANUP] Connecting to ${dbUrl}`);

  const client = new mongodb.MongoClient(dbUrl, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log("[CLEANUP] ✓ Connected to MongoDB");

    const db = client.db("trackme");

    // Remove test users
    const usersCollection = db.collection("users");
    const userDeleteResult = await usersCollection.deleteMany({
      email: { $in: TEST_EMAILS },
    });
    console.log(`[CLEANUP] ✓ Removed ${userDeleteResult.deletedCount} test users`);

    // Remove test devices
    const devicesCollection = db.collection("devices");
    const deviceDeleteResult = await devicesCollection.deleteMany({
      deviceId: { $in: TEST_DEVICE_IDS },
    });
    console.log(`[CLEANUP] ✓ Removed ${deviceDeleteResult.deletedCount} test devices`);

    // Remove test incidents
    const incidentsCollection = db.collection("incidents");
    const incidentDeleteResult = await incidentsCollection.deleteMany({
      incidentId: { $in: TEST_INCIDENT_IDS },
    });
    console.log(`[CLEANUP] ✓ Removed ${incidentDeleteResult.deletedCount} test incidents`);

    // Remove test geofences
    const geofencesCollection = db.collection("geofences");
    const geofenceDeleteResult = await geofencesCollection.deleteMany({
      geofenceId: { $in: TEST_GEOFENCE_IDS },
    });
    console.log(`[CLEANUP] ✓ Removed ${geofenceDeleteResult.deletedCount} test geofences`);

    // Remove any devices owned by test users
    const userOwnedDeleteResult = await devicesCollection.deleteMany({
      ownerId: { $in: TEST_EMAILS },
    });
    console.log(`[CLEANUP] ✓ Removed ${userOwnedDeleteResult.deletedCount} devices owned by test users`);

    console.log("[CLEANUP] ✓ Database cleaned successfully");
  } catch (error) {
    console.error("[CLEANUP] ✗ Cleanup failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

cleanupDatabase();
