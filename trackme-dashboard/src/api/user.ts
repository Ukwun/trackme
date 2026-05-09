
import { getDb } from "./db";
import { ObjectId } from "mongodb";

export async function getUserById(userId: string) {
  const db = await getDb();
  return db.collection("users").findOne({ _id: new ObjectId(userId) });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  return db.collection("users").findOne({ email });
}


export async function updateUserRole(userId: string, role: string) {
  const db = await getDb();
  return db.collection("users").updateOne({ _id: new ObjectId(userId) }, { $set: { role } });
}

export async function listUsers() {
  const db = await getDb();
  return db.collection("users").find({}).toArray();
}
