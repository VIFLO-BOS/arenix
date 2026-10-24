import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/server/db/connect";
import { ClickEvent } from "@/server/db/models/system";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Privacy-appropriate click events (e.g. WhatsApp click-to-chat). No personal data, no IP
 * stored, only an event kind + context + path + day bucket.
 */
const schema = z.object({
  kind: z.enum(["whatsapp_click", "cta_click", "external_link_click"]),
  context: z.string().max(120).optional(),
  path: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!rateLimit(`events:${ip}`, 60, 60_000).ok) return NextResponse.json({ ok: false }, { status: 429 });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await connectDb();
    await ClickEvent.create({ ...parsed.data, day: new Date().toISOString().slice(0, 10) });
  } catch {
    // analytics must never break the page
  }
  return NextResponse.json({ ok: true });
}
