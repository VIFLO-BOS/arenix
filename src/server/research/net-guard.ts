import { BlockList, isIP } from "node:net";

/**
 * Address rules for every request the crawler makes. Only public web servers may be
 * reached: private networks, loopback, link local and cloud metadata addresses are refused,
 * and the check runs on the address the hostname actually resolves to, so a public name
 * pointing at an internal address is refused too. Pure, unit tested.
 */

const blocked = new BlockList();
// IPv4 ranges that are not the public internet.
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link local, includes cloud metadata 169.254.169.254
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved and broadcast
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
// IPv6 ranges that are not the public internet.
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link local
  ["ff00::", 8], // multicast
  ["2001:db8::", 32], // documentation
  ["100::", 64], // discard
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

/** IPv4 address carried inside an IPv6 one (mapped ::ffff:a.b.c.d or NAT64 64:ff9b::a.b.c.d). */
function embeddedIpv4(ip: string): string | undefined {
  const lower = ip.toLowerCase();
  const dotted = lower.match(/^(?:::ffff:|64:ff9b::)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const a = parseInt(hex[1] ?? "0", 16);
    const b = parseInt(hex[2] ?? "0", 16);
    return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
  }
  return undefined;
}

/** True when the address must never be contacted. Anything that is not an IP is refused. */
export function isBlockedIp(ip: string): boolean {
  const bare = ip.replace(/^\[|\]$/g, "").split("%")[0] ?? "";
  const family = isIP(bare);
  if (family === 4) return blocked.check(bare, "ipv4");
  if (family === 6) {
    const v4 = embeddedIpv4(bare);
    if (v4) return isBlockedIp(v4);
    return blocked.check(bare, "ipv6");
  }
  return true;
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/**
 * Checks an address before any request: http or https only, the standard ports only, no
 * user name or password, and no internal host names. IP literals are checked here, host
 * names again after the DNS lookup.
 */
export function checkPublicUrl(raw: string | URL): UrlCheck {
  let url: URL;
  try {
    url = typeof raw === "string" ? new URL(raw) : raw;
  } catch {
    return { ok: false, reason: "The address is not a valid web address." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "Only http and https addresses are fetched." };
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, reason: "Only the standard web ports are fetched." };
  if (url.username || url.password) return { ok: false, reason: "Addresses with a user name or password are not fetched." };
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) return { ok: false, reason: "The address has no host." };
  if (host === "localhost" || /\.(?:localhost|local|internal|intranet|lan|home|corp|arpa)$/.test(host)) return { ok: false, reason: "Internal host names are not fetched." };
  if (isIP(host)) {
    if (isBlockedIp(host)) return { ok: false, reason: "Private and internal addresses are not fetched." };
  } else if (!host.includes(".")) {
    return { ok: false, reason: "Internal host names are not fetched." };
  }
  return { ok: true, url };
}
