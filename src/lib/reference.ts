import { randomInt } from "node:crypto";

// No 0/O/1/I to avoid confusion when read aloud at the salon desk.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReference(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `GT-${s}`;
}
