import "server-only";
import mongoose from "mongoose";
import { env } from "@/lib/env";

/**
 * MongoDB Community Edition connection (Mongoose), cached across hot reloads and
 * serverless invocations. Transactions are NOT used because a standalone community
 * server has no replica set by default; multi-document consistency is handled with
 * ordered writes + idempotent keys instead.
 */
declare global {
  var __arenixMongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cached = global.__arenixMongoose ?? (global.__arenixMongoose = { conn: null, promise: null });

export async function connectDb(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose
      .connect(env.mongodbUri, {
        serverSelectionTimeoutMS: 4000,
        maxPoolSize: 10,
        appName: "arenix",
      })
      .then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

export async function dbHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const m = await connectDb();
    await m.connection.db?.admin().ping();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown database error" };
  }
}
