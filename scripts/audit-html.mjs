#!/usr/bin/env node
/**
 * Static accessibility audit of the BUILT site.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * IS 5568 adopts WCAG 2.0 AA normatively in Israel, with local deviations —
 * the significant one being that 2.4.10 Section Headings is MANDATORY at AA
 * here, where WCAG itself puts it at AAA. So heading structure is not a nice
 * to have on this site; it is a legal requirement, and a skipped level is a
 * failure.
 *
 * These checks run against dist/, not source, because that is what a visitor
 * receives. A component can look correct and still emit a duplicate id once
 * it is rendered three times on a page.
 *
 * ── WHAT THIS IS NOT ──────────────────────────────────────────────────────
 * It is not an accessibility audit. It cannot see contrast, focus order,
 * screen-reader output or whether alt text is truthful rather than merely
 * present. It catches the mechanical failures — the ones that should never
 * survive a commit — so that human review is spent on the rest.
 * docs/QA-CHECKLIST.md covers what only a person can check.
 *
 * Run: npm run lint:a11y   (after a build)
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const LOCALE_DIR = { he: { lang: 'he', dir: 'rtl' }, ar: { lang: 'ar', dir: 'rtl' }, en: { lang: 'en', dir: 'ltr' } };

/** Every .html file under dist/. */
async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** Strip <script>, <style> and comments so their contents never match. */
function strip(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'))?.[1];
const text = (s) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function auditHeadings(html, fail) {
  const levels = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({
    level: Number(m[1]),
    text: text(m[2]).slice(0, 40),
  }));

  if (levels.length === 0) return fail('no headings at all');

  const h1s = levels.filter((h) => h.level === 1);
  if (h1s.length === 0) fail('no <h1>');
  if (h1s.length > 1) fail(`${h1s.length} <h1> elements (expected exactly 1)`);
  if (levels[0].level !== 1) fail(`first heading is h${levels[0].level}, not h1`);

  for (let i = 1; i < levels.length; i++) {
    const jump = levels[i].level - levels[i - 1].level;
    if (jump > 1) {
      fail(`heading skip h${levels[i - 1].level} -> h${levels[i].level} at "${levels[i].text}"`);
    }
  }
}

function auditIds(html, fail) {
  const seen = new Map();
  for (const m of html.matchAll(/\sid=["']([^"']+)["']/g)) {
    seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
  }
  for (const [id, n] of seen) if (n > 1) fail(`duplicate id "${id}" (${n} times)`);
}

function auditImages(html, fail) {
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (attr(m[0], 'alt') === undefined) fail(`<img> with no alt attribute: ${m[0].slice(0, 90)}`);
  }
}

function auditFrames(html, fail) {
  for (const m of html.matchAll(/<iframe\b[^>]*>/gi)) {
    if (!attr(m[0], 'title')) fail('<iframe> with no title attribute');
  }
}

function auditNames(html, fail) {
  // A control whose only content is an icon needs an accessible name; the
  // icons here are all aria-hidden, so there would otherwise be nothing to
  // announce.
  const controls = [
    ...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi),
    ...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi),
  ];
  for (const [, attrs, inner] of controls) {
    if (/\saria-hidden=["']true["']/i.test(attrs)) continue;
    const named =
      text(inner).length > 0 ||
      attr(attrs, 'aria-label') ||
      attr(attrs, 'aria-labelledby') ||
      attr(attrs, 'title');
    if (!named) fail(`control with no accessible name: <${attrs.slice(0, 80)}>`);
  }
}

function auditLangDir(file, html, fail) {
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  const lang = attr(htmlTag, 'lang');
  const dir = attr(htmlTag, 'dir');
  if (!lang) fail('<html> has no lang attribute');
  if (!dir) fail('<html> has no dir attribute');

  const locale = file.split('/').find((p) => p in LOCALE_DIR);
  if (!locale) return;
  const want = LOCALE_DIR[locale];
  if (lang !== want.lang) fail(`lang="${lang}" but the path says ${locale}`);
  if (dir !== want.dir) fail(`dir="${dir}" but ${locale} must be ${want.dir}`);
}

const files = await htmlFiles(DIST).catch(() => []);
if (files.length === 0) {
  console.error('[a11y] dist/ is empty — run a build first.');
  process.exit(1);
}

let failures = 0;
for (const file of files) {
  const rel = relative(DIST, file);
  const problems = [];
  const fail = (msg) => problems.push(msg);
  const html = strip(await readFile(file, 'utf8'));

  auditLangDir(rel, html, fail);
  auditHeadings(html, fail);
  auditIds(html, fail);
  auditImages(html, fail);
  auditFrames(html, fail);
  auditNames(html, fail);

  if (problems.length > 0) {
    failures += problems.length;
    console.error(`\n  ${rel}`);
    for (const p of problems) console.error(`    - ${p}`);
  }
}

if (failures > 0) {
  console.error(`\n[a11y] ${failures} problem(s) across ${files.length} page(s).\n`);
  process.exit(1);
}
console.log(`[a11y] ${files.length} page(s) clean: headings, ids, alt, names, lang/dir.`);
