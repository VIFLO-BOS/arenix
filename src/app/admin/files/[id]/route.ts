import { Types } from "mongoose";
import { getCurrentUser } from "@/server/auth/session";
import { roleHas } from "@/server/auth/permissions";
import { connectDb } from "@/server/db/connect";
import { PrivateFile } from "@/server/db/models/files";
import { ALLOWED_UPLOAD_MIME } from "@/lib/validation/forms";
import { recordAudit } from "@/server/services/audit";

/**
 * Opens a client's attachment for signed in staff who may read inquiries. The file is always
 * downloaded rather than shown in the page, is never cached, and is served under a sandbox
 * policy, so a hostile file cannot run anything in the admin. Every download is audited.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  if (!roleHas(user.role, "inquiries:read")) return new Response("Not allowed.", { status: 403 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return new Response("Not found.", { status: 404 });
  await connectDb();
  // A full document, not lean(), so the file arrives as a Node Buffer.
  const file = await PrivateFile.findById(id);
  if (!file) return new Response("Not found.", { status: 404 });
  await recordAudit({ actor: user, action: "attachment.download", entityType: "PrivateFile", entityId: id });
  const type = ALLOWED_UPLOAD_MIME.has(file.mime) ? file.mime : "application/octet-stream";
  const name = file.filename.replace(/[^\w.-]+/g, "_");
  const bytes = new Uint8Array(Buffer.from(file.data));
  return new Response(bytes, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    },
  });
}
