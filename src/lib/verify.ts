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

/**
 * PREVIEW ONLY. Relaxes the gate entirely.
 *
 * This must never be set on a production build. It was, for a while: the
 * deploy workflow ran `build:preview`, so the gate silently protected nothing
 * and the live site shipped unverified data. Production now uses ACK_UNVERIFIED
 * instead, which is specific and auditable.
 */
const relaxed = process.env.VERIFY_RELAX === '1';

/**
 * PRODUCTION escape hatch — deliberately narrow.
 *
 * A comma-separated list of the exact fields knowingly shipped unverified,
 * e.g. ACK_UNVERIFIED="doctor.ar,doctor.en".
 *
 * The difference from VERIFY_RELAX matters: a blanket bypass absorbs any new
 * placeholder that appears later without anyone noticing. An allowlist fails
 * the build the moment an UNACKNOWLEDGED field appears, so the set of known
 * compromises can only shrink or be consciously extended.
 */
const acknowledged = new Set(
  (process.env.ACK_UNVERIFIED ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

export interface VerificationIssue {
  field: string;
  tier: string;
  note?: string;
  /** True when the value is rendered; false when a guard hides it. */
  published: boolean;
}

/**
 * Fields blocking launch.
 *
 * `published: false` means the value is never rendered while unverified —
 * `hasAddress()`, `hasHours()` and friends hide it. Absent information is not
 * a lie, so those warn rather than block. What must never ship is an
 * unverified value that IS displayed, such as the Arabic spelling of a real
 * person's name.
 */
export function launchBlockers(): VerificationIssue[] {
  return Object.entries(VERIFICATION)
    .filter(([, v]) => v.blocking && (v.tier === 'unverified' || v.tier === 'placeholder'))
    .map(([field, v]) => ({
      field,
      tier: v.tier,
      note: v.note,
      published: v.published !== false,
    }));
}

export function assertLaunchReady(isProdBuild = false): void {
  const blockers = launchBlockers();
  if (blockers.length === 0) return;

  // Only fields that would actually be displayed can fail a production build.
  const published = blockers.filter((b) => b.published);
  const hidden = blockers.filter((b) => !b.published);
  const unacknowledged = published.filter((b) => !acknowledged.has(b.field));

  const fmt = (list: VerificationIssue[]) =>
    list.map((b) => `  - ${b.field.padEnd(22)} [${b.tier}]${b.note ? ` :: ${b.note}` : ''}`).join('\n');

  if (hidden.length > 0) {
    console.warn(
      `\x1b[33m[launch gate] ${hidden.length} field(s) pending, hidden from visitors while unverified:\x1b[0m\n${fmt(hidden)}\n`,
    );
  }

  if (isProdBuild && !relaxed && unacknowledged.length > 0) {
    throw new Error(
      `[launch gate] Refusing to build for production.\n\n` +
        `${unacknowledged.length} unverified field(s) WOULD BE PUBLISHED:\n\n${fmt(unacknowledged)}\n\n` +
        `Either verify them in src/data/clinic.ts, or acknowledge them explicitly:\n` +
        `  ACK_UNVERIFIED="${unacknowledged.map((b) => b.field).join(',')}"\n\n` +
        `Do NOT use VERIFY_RELAX in production — it hides everything, including\n` +
        `whatever placeholder is added next.\n`,
    );
  }

  if (published.length > 0) {
    const ack = published.filter((b) => acknowledged.has(b.field));
    if (ack.length > 0) {
      console.warn(
        `\x1b[33m[launch gate] ${ack.length} unverified field(s) shipping with explicit acknowledgement:\x1b[0m\n${fmt(ack)}\n`,
      );
    }
  }
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
