import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { connectDb } from "@/server/db/connect";
import { PrivateFile } from "@/server/db/models/files";

/**
 * Media/attachment storage. Driver "local" writes under ./public/uploads (dev + simple
 * self-hosting). Driver "s3" is a documented extension point: it validates config and
 * throws a clear error until credentials are supplied (no fake success).
 */
export type StoredFile = { storageKey: string; url: string; filename: string; mime: string; size: number };

const SAFE_NAME = /[^a-zA-Z0-9._-]+/g;

function safeFilename(original: string) {
  const ext = path.extname(original).toLowerCase().slice(0, 10);
  const base = path.basename(original, path.extname(original)).replace(SAFE_NAME, "-").slice(0, 60) || "file";
  return `${base}-${randomBytes(6).toString("hex")}${ext}`;
}

/**
 * Most space private attachments may take in the database. Leaves room on MongoDB Atlas's
 * free 512 MB tier, so attachments can never push the database into a paid plan.
 */
export const ATTACHMENT_QUOTA_BYTES = 150 * 1024 * 1024;

export class StorageFullError extends Error {
  constructor() {
    super("Attachments cannot be accepted right now. Please send your request without files and share them after we reply.");
    this.name = "StorageFullError";
  }
}

/** A client's attachment, stored privately in the database. Only signed in staff can open it. */
async function savePrivateFile(file: File, buffer: Buffer): Promise<StoredFile> {
  await connectDb();
  const [used] = await PrivateFile.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: "$size" } } }]);
  if ((used?.total ?? 0) + buffer.length > ATTACHMENT_QUOTA_BYTES) throw new StorageFullError();
  const filename = safeFilename(file.name);
  const doc = await PrivateFile.create({ filename, mime: file.type, size: buffer.length, data: buffer });
  const id = doc._id.toString();
  return { storageKey: `private:${id}`, url: `/admin/files/${id}`, filename, mime: file.type, size: buffer.length };
}

export async function saveUploadedFile(file: File, folder: "attachments" | "media"): Promise<StoredFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  // Client attachments are confidential. They never go to a public folder.
  if (folder === "attachments") return savePrivateFile(file, buffer);
  const filename = safeFilename(file.name);
  const storageKey = `${folder}/${filename}`;

  if (env.mediaStorageDriver === "s3") {
    if (!env.s3.bucket || !env.s3.accessKeyId) throw new Error("S3 storage selected but S3_* environment variables are not configured.");
    // Intentionally not implemented without credentials; adapter boundary kept small.
    throw new Error("S3 adapter not configured in this build. Set MEDIA_STORAGE_DRIVER=local or supply an S3 adapter.");
  }

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return { storageKey, url: `/uploads/${storageKey}`, filename, mime: file.type, size: file.size };
}

export async function deleteStoredFile(storageKey: string) {
  if (storageKey.startsWith("private:")) {
    await connectDb();
    await PrivateFile.deleteOne({ _id: storageKey.slice("private:".length) });
    return;
  }
  if (env.mediaStorageDriver !== "local") return;
  const safe = storageKey.replace(/\.\./g, "");
  try {
    await unlink(path.join(process.cwd(), "public", "uploads", safe));
  } catch {
    /* already gone */
  }
}

/** Basic magic-number sniffing so a renamed executable cannot pass as a PDF/PNG. */
export function sniffMime(buffer: Buffer, declared: string): boolean {
  const head = buffer.subarray(0, 12);
  const hex = head.toString("hex");
  if (declared === "application/pdf") return head.toString("ascii", 0, 4) === "%PDF";
  if (declared === "image/png") return hex.startsWith("89504e47");
  if (declared === "image/jpeg") return hex.startsWith("ffd8ff");
  if (declared === "image/webp") return head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP";
  if (declared === "image/avif") return head.toString("ascii", 4, 8) === "ftyp";
  if (declared === "text/plain") return true;
  if (declared === "application/msword") return hex.startsWith("d0cf11e0");
  if (declared === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return hex.startsWith("504b0304");
  return false;
}
