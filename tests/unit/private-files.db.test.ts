import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Client attachments are stored privately in the database with a size cap. Uses its own
 * database, arenix_vitest_files, and is skipped when no local MongoDB is running.
 */
const TEST_DB = "arenix_vitest_files";
vi.hoisted(() => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/arenix_vitest_files";
});

import mongoose from "mongoose";
import { connectDb } from "@/server/db/connect";
import { PrivateFile } from "@/server/db/models/files";
import { ATTACHMENT_QUOTA_BYTES, StorageFullError, deleteStoredFile, saveUploadedFile } from "@/server/services/storage";

let available = true;
try {
  await connectDb();
} catch {
  available = false;
}
const onTestDb = () => mongoose.connection.name === TEST_DB;

describe.skipIf(!available)("private attachments (local MongoDB)", () => {
  beforeAll(() => {
    if (!onTestDb()) throw new Error("Refusing to run outside the test database.");
  });
  beforeEach(async () => {
    if (onTestDb()) await PrivateFile.deleteMany({});
  });
  afterAll(async () => {
    if (onTestDb()) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("stores an attachment privately and never under a public address", async () => {
    const file = new File([Buffer.from("%PDF-1.4 brief")], "Project brief (final).pdf", { type: "application/pdf" });
    const stored = await saveUploadedFile(file, "attachments");
    expect(stored.storageKey).toMatch(/^private:[a-f0-9]{24}$/);
    expect(stored.url).toMatch(/^\/admin\/files\/[a-f0-9]{24}$/);
    expect(stored.url).not.toContain("/uploads/");
    const doc = await PrivateFile.findById(stored.storageKey.slice(8));
    expect(Buffer.from(doc!.data).toString()).toBe("%PDF-1.4 brief");
    // Unsafe characters become hyphens and a random suffix keeps names unique.
    expect(doc!.filename).toMatch(/^Project-brief-final-+[a-f0-9]{12}\.pdf$/);

    await deleteStoredFile(stored.storageKey);
    expect(await PrivateFile.countDocuments({})).toBe(0);
  });

  it("refuses new attachments once the free tier cap would be passed", async () => {
    // A record that claims the quota is already used.
    await PrivateFile.create({ filename: "big.pdf", mime: "application/pdf", size: ATTACHMENT_QUOTA_BYTES - 10, data: Buffer.from("x") });
    const file = new File([Buffer.alloc(100, 1)], "more.pdf", { type: "application/pdf" });
    await expect(saveUploadedFile(file, "attachments")).rejects.toBeInstanceOf(StorageFullError);
    expect(await PrivateFile.countDocuments({})).toBe(1);
  });
});
