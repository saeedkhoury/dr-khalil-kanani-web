/**
 * TEXT HYGIENE — one rule, two enforcers.
 *
 * The deploy's mixed-script linter (scripts/lint-mixed-scripts.mjs) refuses
 * these characters anywhere in src/. The admin Worker applies the SAME rule to
 * every CMS write (http.ts readJson), so an edit can never be committed that
 * the deploy will then refuse. Before this existed, one invisible mark typed
 * on an iPhone left a doctor's change committed but unpublishable (2026-09-26).
 *
 * - Invisible direction/zero-width characters are REMOVED: keyboards insert
 *   them without the writer knowing, and removing them changes nothing a
 *   reader sees on this site (Latin runs are isolated with .u-ltr).
 * - A letter from another alphabet is REFUSED: a Cyrillic ka (U+043A) inside an Arabic
 *   word looks identical but is a different word to search engines and screen
 *   readers, and there is no safe automatic replacement.
 */

/** Scripts that should never appear in this site's content. */
export const FORBIDDEN_RANGES: ReadonlyArray<{ name: string; test: (code: number) => boolean }> = [
  { name: 'Cyrillic', test: (c) => c >= 0x0400 && c <= 0x04ff },
  { name: 'Greek', test: (c) => c >= 0x0370 && c <= 0x03ff },
  { name: 'Armenian', test: (c) => c >= 0x0530 && c <= 0x058f },
];

/** Invisible characters that corrupt bidi text and are almost always a mistake. */
export const SUSPECT_INVISIBLES: ReadonlyMap<number, string> = new Map([
  [0x200b, 'ZERO WIDTH SPACE'],
  [0x200e, 'LEFT-TO-RIGHT MARK'],
  [0x200f, 'RIGHT-TO-LEFT MARK'],
  [0x202a, 'LEFT-TO-RIGHT EMBEDDING'],
  [0x202b, 'RIGHT-TO-LEFT EMBEDDING'],
  [0x202d, 'LEFT-TO-RIGHT OVERRIDE'],
  [0x202e, 'RIGHT-TO-LEFT OVERRIDE'],
  [0xfeff, 'ZERO WIDTH NO-BREAK SPACE'],
]);

const INVISIBLE = new RegExp(`[${[...SUSPECT_INVISIBLES.keys()].map((c) => `\\u{${c.toString(16)}}`).join('')}]`, 'gu');

export function cleanInvisibles(text: string): string {
  return text.replace(INVISIBLE, '');
}

/** The first letter from a forbidden alphabet, or null. */
export function forbiddenScriptIn(text: string): { script: string; char: string } | null {
  for (const char of text) {
    const code = char.codePointAt(0)!;
    const range = FORBIDDEN_RANGES.find((r) => r.test(code));
    if (range) return { script: range.name, char };
  }
  return null;
}

/** Request fields that carry image bytes (base64), never text. */
const IMAGE_DATA = new Set(['contentBase64']);

/**
 * Clean every string in a parsed JSON value (a CMS request body). Returns the
 * cleaned value, or the first forbidden letter found. Pure: the input is not
 * modified.
 */
export function cleanJsonText(value: unknown): { ok: true; value: unknown } | { ok: false; script: string; char: string } {
  let refused: { script: string; char: string } | null = null;
  const walk = (node: unknown): unknown => {
    if (refused) return node;
    if (typeof node === 'string') {
      const found = forbiddenScriptIn(node);
      if (found) { refused = found; return node; }
      return cleanInvisibles(node);
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node !== null && typeof node === 'object') {
      // Image bytes are not text. A photo arrives as megabytes of base64;
      // scanning and copying it pushed the Worker past its resource limit
      // (2026-09-30), so it is passed through as the very same string.
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, IMAGE_DATA.has(k) ? v : walk(v)]));
    }
    return node;
  };
  const cleaned = walk(value);
  return refused ? { ok: false, ...(refused as { script: string; char: string }) } : { ok: true, value: cleaned };
}
