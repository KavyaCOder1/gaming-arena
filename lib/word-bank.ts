/**
 * lib/word-bank.ts
 *
 * Loads words.txt and serves words by exact length.
 * Supports range specs (e.g. "8 OR 9 letters") for hard mode.
 */

import fs   from "fs";
import path from "path";

// ── Load & index by exact length once ─────────────────────────────────────────
function loadByLength(): Map<number, string[]> {
  const filePath = path.join(process.cwd(), "lib", "words.txt");
  const raw      = fs.readFileSync(filePath, "utf-8");
  const map      = new Map<number, string[]>();

  raw
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("#"))
    .map(l => l.toUpperCase())
    .filter(l => /^[A-Z]+$/.test(l))           // pure alpha only
    .forEach(w => {
      const bucket = map.get(w.length) ?? [];
      bucket.push(w);
      map.set(w.length, bucket);
    });

  return map;
}

const BY_LENGTH = loadByLength();

// ── Fisher-Yates ──────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Public types ──────────────────────────────────────────────────────────────
export interface WordSpec {
  length:    number;    // exact length (primary)
  altLength?: number;   // fallback length if primary pool runs out (e.g. 8 for "8-9")
  count:     number;
}

/**
 * Pick words matching the spec array.
 * Each spec entry picks `count` words of `length` letters.
 * If not enough found, falls back to `altLength` then ±1.
 *
 * Hard mode "2 words of 8-9 letters" →
 *   { length: 9, altLength: 8, count: 2 }
 */
export function pickWordsBySpec(spec: WordSpec[]): string[] {
  const used   = new Set<string>();
  const result: string[] = [];

  for (const { length, altLength, count } of spec) {
    // Primary pool
    const primary = shuffle((BY_LENGTH.get(length) ?? []).filter(w => !used.has(w)));

    const picks: string[] = primary.slice(0, count);

    // If still short, try altLength
    if (picks.length < count && altLength) {
      const alt = shuffle((BY_LENGTH.get(altLength) ?? []).filter(w => !used.has(w)));
      picks.push(...alt.slice(0, count - picks.length));
    }

    // If still short, try ±1 from primary
    if (picks.length < count) {
      for (const delta of [-1, 1, -2, 2]) {
        if (picks.length >= count) break;
        const extra = shuffle((BY_LENGTH.get(length + delta) ?? []).filter(w => !used.has(w) && !picks.includes(w)));
        picks.push(...extra.slice(0, count - picks.length));
      }
    }

    picks.forEach(w => used.add(w));
    result.push(...picks);
  }

  return shuffle(result);   // shuffle so word order is unpredictable
}
