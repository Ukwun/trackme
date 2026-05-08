import { getDb } from "./db";

export async function getUserById(userId: string) {
  const db = await getDb();
  return db.collection("users").findOne({ _id: userId });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  return db.collection("users").findOne({ email });
}

export async function updateUserRole(userId: string, role: string) {
  const db = await getDb();
  return db.collection("users").updateOne({ _id: userId }, { $set: { role } });
}

export async function listUsers() {
  const db = await getDb();
  return db.collection("users").find({}).toArray();
}
