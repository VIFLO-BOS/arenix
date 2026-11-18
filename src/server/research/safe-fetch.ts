import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import zlib from "node:zlib";
import { checkPublicUrl, isBlockedIp } from "./net-guard";

/**
 * The only way the crawler fetches a web page. It
 *   - refuses private, loopback and metadata addresses, checking the address the hostname
 *     resolves to at connection time, so DNS tricks cannot reach internal services,
 *   - follows at most five redirects and checks every hop the same way,
 *   - stops reading after a size limit (after decompression, so a small compressed bomb
 *     cannot fill memory) and after a time limit,
 *   - never runs page scripts. It only returns bytes.
 */

export type FetchFailureKind = "bad_url" | "blocked" | "dns" | "connection" | "tls" | "timeout" | "too_large" | "too_many_redirects";

export class FetchFailure extends Error {
  readonly kind: FetchFailureKind;
  constructor(kind: FetchFailureKind, message: string) {
    super(message);
    this.name = "FetchFailure";
    this.kind = kind;
  }
}

export interface SafeFetchOptions {
  userAgent: string;
  timeoutMs: number;
  maxBytes: number;
  method?: "GET" | "HEAD";
  accept?: string;
  maxRedirects?: number;
}

export interface SafeResponse {
  /** The address the redirects ended on. */
  url: string;
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  /** True when the body was cut at the size limit. */
  truncated: boolean;
  redirects: number;
  /** Every address visited, first to last. */
  chain: string[];
}

/** DNS lookup that refuses the whole host when any of its addresses is internal. */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true, family: options.family, hints: options.hints }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as LookupAddress[];
    if (!list.length) return callback(Object.assign(new Error(`No address for ${hostname}`), { code: "ENOTFOUND" }), "", 0);
    if (list.some((a) => isBlockedIp(a.address))) {
      return callback(Object.assign(new Error(`${hostname} resolves to an internal address`), { code: "EBLOCKED" }), "", 0);
    }
    // Node asks for every address when it races IPv4 and IPv6, and for one otherwise.
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
    const first = list[0] as LookupAddress;
    callback(null, first.address, first.family);
  });
};

function classify(err: unknown): FetchFailure {
  if (err instanceof FetchFailure) return err;
  const code = (err as { code?: string }).code ?? "";
  const message = err instanceof Error ? err.message : "Request failed";
  if (code === "EBLOCKED") return new FetchFailure("blocked", message);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ENODATA") return new FetchFailure("dns", `The domain does not resolve (${code}).`);
  if (/CERT|SSL|TLS|ERR_TLS|SELF_SIGNED|UNABLE_TO_VERIFY|EPROTO/i.test(code) || /certificate|ssl|tls/i.test(message)) return new FetchFailure("tls", `The secure connection failed (${code || message}).`);
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") return new FetchFailure("timeout", "The site took too long to answer.");
  return new FetchFailure("connection", `The connection failed (${code || message}).`);
}

function requestOnce(url: URL, opts: SafeFetchOptions, deadline: number): Promise<{ status: number; headers: Record<string, string>; body: Buffer; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new FetchFailure("timeout", "The site took too long to answer."));
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: opts.method ?? "GET",
        lookup: guardedLookup,
        headers: {
          "user-agent": opts.userAgent,
          accept: opts.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en",
        },
        // Never reuse a connection: each request gets a fresh, checked lookup.
        agent: false,
      },
      (res) => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) headers[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v);
        const status = res.statusCode ?? 0;
        if ((opts.method ?? "GET") === "HEAD" || (status >= 300 && status < 400)) {
          res.resume();
          return resolve({ status, headers, body: Buffer.alloc(0), truncated: false });
        }
        const declared = Number(headers["content-length"] ?? "0");
        if (declared > opts.maxBytes * 4) {
          res.destroy();
          return resolve({ status, headers, body: Buffer.alloc(0), truncated: true });
        }
        const encoding = (headers["content-encoding"] ?? "").toLowerCase();
        const stream =
          encoding.includes("br") ? res.pipe(zlib.createBrotliDecompress()) : encoding.includes("gzip") ? res.pipe(zlib.createGunzip()) : encoding.includes("deflate") ? res.pipe(zlib.createInflate()) : res;
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        stream.on("data", (chunk: Buffer) => {
          if (truncated) return;
          size += chunk.length;
          if (size > opts.maxBytes) {
            truncated = true;
            chunks.push(chunk.subarray(0, chunk.length - (size - opts.maxBytes)));
            res.destroy();
            resolve({ status, headers, body: Buffer.concat(chunks), truncated });
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () => resolve({ status, headers, body: Buffer.concat(chunks), truncated }));
        stream.on("error", (e) => (truncated ? undefined : reject(classify(e))));
      },
    );
    const timer = setTimeout(() => req.destroy(new FetchFailure("timeout", "The site took too long to answer.")), remaining);
    req.on("error", (e) => reject(classify(e)));
    req.on("close", () => clearTimeout(timer));
    req.end();
  });
}

export async function safeFetch(raw: string, opts: SafeFetchOptions): Promise<SafeResponse> {
  const maxRedirects = opts.maxRedirects ?? 5;
  const deadline = Date.now() + opts.timeoutMs;
  const chain: string[] = [];
  let current = raw;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const check = checkPublicUrl(current);
    if (!check.ok) throw new FetchFailure(check.reason.includes("valid") ? "bad_url" : "blocked", check.reason);
    const url = check.url;
    url.hash = "";
    chain.push(url.toString());
    const res = await requestOnce(url, opts, deadline);
    const location = res.headers.location;
    if (res.status >= 300 && res.status < 400 && location) {
      try {
        current = new URL(location, url).toString();
      } catch {
        throw new FetchFailure("bad_url", "The site redirected to an invalid address.");
      }
      continue;
    }
    return { url: url.toString(), status: res.status, headers: res.headers, body: res.body, truncated: res.truncated, redirects: hop, chain };
  }
  throw new FetchFailure("too_many_redirects", "The site redirected too many times.");
}

/** Decodes an HTML body using the charset from the header or the page, UTF 8 by default. */
export function decodeHtml(body: Buffer, contentType?: string): string {
  const fromHeader = contentType?.match(/charset=["']?([\w-]+)/i)?.[1];
  const head = body.subarray(0, 2048).toString("latin1");
  const fromMeta = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const charset = (fromHeader ?? fromMeta ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset === "iso-8859-1" || charset === "latin1" ? "windows-1252" : charset).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}
