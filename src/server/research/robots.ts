/**
 * robots.txt handling following RFC 9309. The crawler reads a site's robots.txt before any
 * other page and obeys it: the group for our user agent token if there is one, otherwise the
 * group for every crawler. Pure, unit tested.
 */

/** The product token in the crawler's User-Agent. Site owners can name it in robots.txt. */
export const ROBOTS_TOKEN = "areniXResearchBot";

interface Rule {
  allow: boolean;
  pattern: string;
}

interface Group {
  agents: string[];
  rules: Rule[];
  crawlDelay?: number;
}

export interface RobotsRules {
  groups: Group[];
  /** Set from the HTTP status: everything allowed (4xx) or nothing (5xx, network failure). */
  mode?: "allow_all" | "disallow_all";
}

const MAX_BYTES = 500 * 1024;

export function parseRobots(text: string): RobotsRules {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  const body = text.replace(/^﻿/, "").slice(0, MAX_BYTES);
  for (const rawLine of body.split(/\r\n|\r|\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" || field === "disallow") {
      // An empty Disallow allows everything, so it adds no rule.
      if (value || field === "allow") current.rules.push({ allow: field === "allow", pattern: value });
    } else if (field === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.crawlDelay = n;
    }
  }
  return { groups };
}

function groupFor(rules: RobotsRules, token: string): Group | undefined {
  const t = token.toLowerCase();
  // The product token is matched case insensitively. A version after a slash is ignored.
  const specific = rules.groups.filter((g) => g.agents.some((a) => a.replace(/\/.*$/, "").trim() === t));
  const chosen = specific.length ? specific : rules.groups.filter((g) => g.agents.includes("*"));
  if (!chosen.length) return undefined;
  // Groups for the same agent are merged.
  return { agents: [], rules: chosen.flatMap((g) => g.rules), crawlDelay: chosen.map((g) => g.crawlDelay).find((d) => d !== undefined) };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Length of the match of one rule pattern at the start of the path, or -1 when it does not match. */
function matchLength(pattern: string, path: string): number {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp(`^${body.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}${anchored ? "$" : ""}`);
  return re.test(path) ? pattern.length : -1;
}

/** May the crawler fetch this path (path plus query)? */
export function isAllowed(rules: RobotsRules, path: string, token = ROBOTS_TOKEN): boolean {
  if (rules.mode === "allow_all") return true;
  if (rules.mode === "disallow_all") return false;
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/robots.txt") return true;
  const group = groupFor(rules, token);
  if (!group) return true;
  const candidates = [p, safeDecode(p)];
  let best: { length: number; allow: boolean } | undefined;
  for (const rule of group.rules) {
    const patterns = [rule.pattern, safeDecode(rule.pattern)];
    let length = -1;
    for (const pat of patterns) for (const c of candidates) length = Math.max(length, matchLength(pat, c));
    if (length < 0) continue;
    // Longest match wins. On a tie, Allow wins.
    if (!best || length > best.length || (length === best.length && rule.allow)) best = { length, allow: rule.allow };
  }
  return best ? best.allow : true;
}

/** Crawl delay asked for by the site, in seconds, capped at 30. */
export function crawlDelaySeconds(rules: RobotsRules, token = ROBOTS_TOKEN): number | undefined {
  const delay = groupFor(rules, token)?.crawlDelay;
  return delay === undefined ? undefined : Math.min(30, delay);
}

/**
 * Rules for a robots.txt response. A 2xx body is parsed. Any 4xx other than 429 means there
 * are no rules. A 429, a 5xx or a network failure (status 0) means the site cannot say, so
 * nothing is fetched.
 */
export function rulesForStatus(status: number, body: string): RobotsRules {
  if (status >= 200 && status < 300) return parseRobots(body);
  if (status >= 400 && status < 500 && status !== 429) return { groups: [], mode: "allow_all" };
  return { groups: [], mode: "disallow_all" };
}
