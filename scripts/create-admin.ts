/**
 * Creates the first SUPER_ADMIN from BOOTSTRAP_ADMIN_* environment variables.
 * Refuses to run if a user with that email already exists. Never exposed over HTTP.
 *
 *   npm run db:create-admin
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/server/db/models/user";

loadEnv({ path: ".env.local", override: false });

async function main() {
  const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/arenix";
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").toLowerCase().trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  const name = process.env.BOOTSTRAP_ADMIN_NAME ?? "Super Admin";
  if (!email || !password) throw new Error("Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD in .env.local first.");
  if (password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  if (await User.exists({ email })) {
    console.log(`A user with ${email} already exists. Nothing changed.`);
  } else {
    await User.create({ email, name, passwordHash: await bcrypt.hash(password, 12), role: "SUPER_ADMIN", isActive: true });
    console.log(`Created SUPER_ADMIN ${email}. Sign in at /admin/login and invite the rest of the team from /admin/team.`);
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("create-admin failed:", err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
