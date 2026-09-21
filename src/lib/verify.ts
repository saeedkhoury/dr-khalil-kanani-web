/**
 * Build-time content-integrity gates.
 *
 * Two guarantees, both enforced during `astro build`:
 *
 *   1. assertLaunchReady()  — no unverified clinic fact reaches production.
 *   2. assertLocaleParity() — no treatment exists in one language but not another.
 *
 * These exist because the two highest risks on this project are publishing an
 * invented fact about a real doctor, and shipping a language that is silently
 * missing content. Both are turned into failed builds rather than review notes.
 */

import { VERIFICATION, LOCALES, type Locale } from '../data/clinic';

/** Set VERIFY_RELAX=1 to build with unverified data (local preview only). */
const relaxed = process.env.VERIFY_RELAX === '1';

export interface VerificationIssue {
  field: string;
  tier: string;
  note?: string;
}

/** Fields still blocking launch. Empty array means the site is publishable. */
export function launchBlockers(): VerificationIssue[] {
  return Object.entries(VERIFICATION)
    .filter(([, v]) => v.blocking && (v.tier === 'unverified' || v.tier === 'placeholder'))
    .map(([field, v]) => ({ field, tier: v.tier, note: v.note }));
}

export function assertLaunchReady(isProdBuild = false): void {
  const blockers = launchBlockers();
  if (blockers.length === 0) return;

  const report = blockers
    .map((b) => `  - ${b.field.padEnd(22)} [${b.tier}]${b.note ? ` :: ${b.note}` : ''}`)
    .join('\n');

  const message =
    `\n${blockers.length} clinic fact(s) are not owner-verified:\n\n${report}\n\n` +
    `Resolve these in src/data/clinic.ts and update VERIFICATION, or set\n` +
    `VERIFY_RELAX=1 to build a non-production preview.\n`;

  if (isProdBuild && !relaxed) {
    throw new Error(`[launch gate] Refusing to build for production.${message}`);
  }
  console.warn(`\x1b[33m[launch gate] ${blockers.length} unverified field(s).\x1b[0m${message}`);
}

/**
 * Every content entry must exist in all three locales.
 *
 * Without this, a missing Arabic treatment page degrades silently into a 404
 * that nobody notices — the exact failure mode a three-language site is most
 * prone to.
 */
export function assertLocaleParity(
  collection: string,
  ids: string[],
  isProdBuild = process.env.NODE_ENV === 'production',
): { ok: boolean; missing: Array<{ slug: string; missing: Locale[] }> } {
  const bySlug = new Map<string, Set<Locale>>();

  for (const id of ids) {
    // Content IDs are shaped "<locale>/<slug>"
    const [locale, ...rest] = id.split('/');
    const slug = rest.join('/');
    if (!LOCALES.includes(locale as Locale) || !slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, new Set());
    bySlug.get(slug)!.add(locale as Locale);
  }

  const missing = [...bySlug.entries()]
    .map(([slug, present]) => ({
      slug,
      missing: LOCALES.filter((l) => !present.has(l)),
    }))
    .filter((r) => r.missing.length > 0);

  if (missing.length > 0) {
    const report = missing.map((m) => `  - ${m.slug} :: missing ${m.missing.join(', ')}`).join('\n');
    const message = `\n[locale parity] "${collection}" is incomplete:\n\n${report}\n`;
    if (isProdBuild && !relaxed) throw new Error(message);
    console.warn(`\x1b[33m${message}\x1b[0m`);
  }

  return { ok: missing.length === 0, missing };
}
