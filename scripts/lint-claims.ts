#!/usr/bin/env node
/**
 * MEDICAL CLAIMS LINTER
 *
 * Encodes תקנות רופאי השיניים (פרסומת אסורה), תשס"ט-2009 — the Israeli
 * Prohibited Advertising Regulations for dentists — as a mechanical check.
 *
 * The regulations forbid advertising that guarantees treatment success,
 * publishes prices or promotions, praises the dentist's professional skill,
 * claims unrecognised specialist titles, or publishes success statistics
 * without Ministry of Health approval. Violation is a criminal offence and
 * the dentist remains responsible even when an agency wrote the copy.
 *
 * This linter cannot make the site lawful — only an Israeli lawyer can sign
 * that off. What it does is stop the most common violations from being
 * introduced silently by a future edit.
 *
 * Usage:  npm run lint:claims
 * Exit 1 on any ERROR. WARN findings print but do not fail.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

import { findClaims, type ClaimFinding } from '../src/lib/claims.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN_DIRS = ['src/content', 'src/i18n', 'src/components', 'src/pages'];

/**
 * CMS-WRITABLE DATA — scanned by exact filename, not by directory.
 *
 * clinic-photography.json holds alt text the clinic owner writes through the
 * admin panel, and it is published on the site. It was covered by nothing:
 * SCAN_DIRS above lists developer-authored directories only, so once the CMS
 * existed, owner-authored claims could reach the live site past the one
 * control built to stop them.
 *
 * Named individually rather than adding `src/data`, because that directory
 * also holds media.ts, whose treatment-work descriptions legitimately say
 * "before and after" — they describe owner-directed photographs reviewed
 * under ADR 0009. Scanning the whole directory flags 29 of them and fails the
 * build on content that was already accepted. Those are developer-managed and
 * the CMS cannot write that file; widening the net to cover them is separate
 * work with its own review, not a side effect of closing this gap.
 */
const SCAN_FILES = ['src/data/clinic-photography.json', 'src/data/hours.json'];
const SCAN_EXT = new Set(['.md', '.mdx', '.ts', '.astro', '.json']);

/* The rules themselves live in src/lib/claims.ts, imported above, because
   the admin Worker applies the SAME list before it will commit anything. Two
   copies would drift, and a drifted copy reports "checked" while checking
   something else. */
/** Strip comments so documentation that *names* a banned phrase (to warn
 *  against it) does not trip the linter. */
function stripComments(source: string, ext: string): string {
  if (ext === '.md' || ext === '.mdx') return source;
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function walk(dir: string, out: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(extname(full))) out.push(full);
  }
  return out;
}

const findings: (ClaimFinding & { file: string; line: number })[] = [];

// Decode JSON before checking strings: unicode escapes and comment-like text
// are content, not source-code syntax. Scan whole fields, including newlines.
function jsonStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(jsonStrings);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(jsonStrings);
  return [];
}

const targets = [
  ...SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir))),
  ...SCAN_FILES.map((file) => join(ROOT, file)),
];

{
  for (const file of targets) {
    const ext = extname(file);
    const raw = readFileSync(file, 'utf8');
    const texts = ext === '.json' ? jsonStrings(JSON.parse(raw)) : stripComments(raw, ext).split('\n');
    texts.forEach((text, i) => {
      for (const finding of findClaims(text)) {
        findings.push({ ...finding, file: relative(ROOT, file), line: ext === '.json' ? 1 : i + 1 });
      }
    });
  }
}

const errors = findings.filter((f) => f.severity === 'error');
const warns = findings.filter((f) => f.severity === 'warn');

const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const GRN = '\x1b[32m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

if (findings.length === 0) {
  console.log(`${GRN}✓ claims linter: no prohibited advertising patterns found.${OFF}`);
  process.exit(0);
}

for (const group of [
  { list: errors, color: RED, label: 'ERROR' },
  { list: warns, color: YEL, label: 'WARN ' },
]) {
  for (const f of group.list) {
    console.log(
      `${group.color}${group.label}${OFF} ${f.file}:${f.line}  ${group.color}${f.rule}${OFF} — "${f.match}"\n` +
        `      ${DIM}${f.why}${OFF}`,
    );
  }
}

console.log(
  `\n${errors.length} error(s), ${warns.length} warning(s).` +
    `\n${DIM}This check is a safety net, not legal advice. Israeli counsel must review final copy.${OFF}`,
);

process.exit(errors.length > 0 ? 1 : 0);
