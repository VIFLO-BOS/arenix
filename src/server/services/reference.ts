import "server-only";
import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

/** Human-friendly unique public reference, e.g. ARX-INQ-7K3M2Q */
export function makeReference(prefix: "INQ" | "BKG" | "PRP" | "QTE") {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `ARX-${prefix}-${out}`;
}
