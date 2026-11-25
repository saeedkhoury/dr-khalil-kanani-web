#!/usr/bin/env node
/**
 * Read-only production watch runner (.github/workflows/scheduled-check.yml).
 *
 *   node scripts/ops/prod-check.mjs smoke            pages, lang/dir, deployed build
 *   node scripts/ops/prod-check.mjs perf <dir>       evaluate Lighthouse JSON in <dir>
 *
 * Only GET requests. Never writes to production. Prints a Markdown report and,
 * when anything is wrong, writes it to ops-problems.md and exits 1 so the
 * workflow can open an alert issue.
 *
 * Env: ORIGIN (default https://www.drkhalilkanani.com), EXPECTED_SHA and
 * COMMIT_AGE_MIN (smoke; set by the workflow from the checked-out main).
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  PAGES,
  EXTRA_PATHS,
  evaluatePage,
  evaluateBuild,
  evaluateLighthouse,
  evaluateRelay,
  relayEndpointFrom,
  medianRun,
} from './checks.mjs';

const ORIGIN = process.env.ORIGIN || 'https://www.drkhalilkanani.com';
const TIMEOUT_MS = 20_000;

async function get(path) {
  const started = performance.now();
  try {
    const res = await fetch(ORIGIN + path, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'drkanani-ops-watch (read-only)' },
    });
    const body = await res.text();
    return { path, status: res.status, ms: performance.now() - started, html: body };
  } catch (error) {
    return { path, status: 0, ms: performance.now() - started, html: '', error: String(error?.message || error) };
  }
}

async function smoke() {
  const results = await Promise.all([...PAGES, ...EXTRA_PATHS].map(get));
  const problems = results.flatMap((r) =>
    r.status === 0 ? [`${r.path}: request failed (${r.error})`] : evaluatePage(r),
  );

  const expected = process.env.EXPECTED_SHA;
  let buildLine = 'deployed build: not checked (EXPECTED_SHA unset)';
  if (expected) {
    const stamp = await get('/build.txt');
    problems.push(
      ...evaluateBuild({
        live: stamp.status === 200 ? stamp.html : '',
        expected,
        commitAgeMin: Number(process.env.COMMIT_AGE_MIN || 0),
      }),
    );
    buildLine = `deployed build: ${stamp.html.trim().slice(0, 7) || 'unreadable'} · main: ${expected.slice(0, 7)}`;
  }

  const relayLine = await checkRelay(problems);

  const rows = results.map((r) => `| \`${r.path}\` | ${r.status || 'error'} | ${Math.round(r.ms)} ms |`);
  return report(
    'Production smoke check',
    ['| Path | Status | Time |', '|---|---|---|', ...rows, '', buildLine, relayLine],
    problems,
  );
}

/** CORS preflight only: proves the relay is up and sends no email. */
async function checkRelay(problems) {
  const endpoint = relayEndpointFrom(await readFile(new URL('../../src/data/clinic.ts', import.meta.url), 'utf8'));
  if (!endpoint) return 'appointment relay: not configured (WhatsApp handoff only)';
  let status = 0;
  try {
    const res = await fetch(endpoint, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { origin: ORIGIN, 'access-control-request-method': 'POST' },
    });
    status = res.status;
  } catch {
    // status stays 0 and is reported as "no response".
  }
  problems.push(...evaluateRelay({ status }));
  return `appointment relay preflight: ${status || 'no response'}`;
}

async function perf(dir) {
  // Files are <locale>.json or <locale>-<run>.json; runs of one page are
  // judged by their median (see medianRun).
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const pages = new Map();
  for (const file of files) {
    const page = file.replace(/(-\d+)?\.json$/, '');
    let lhr = {};
    try {
      lhr = JSON.parse(await readFile(join(dir, file), 'utf8'));
    } catch {
      // An unreadable report counts as a failed run.
    }
    pages.set(page, [...(pages.get(page) ?? []), lhr]);
  }
  const rows = [];
  const problems = [];
  for (const [page, runs] of pages) {
    const path = `/${page}/`;
    const lhr = medianRun(runs);
    problems.push(...evaluateLighthouse(path, lhr));
    const score = lhr.categories?.performance?.score;
    const lcp = lhr.audits?.['largest-contentful-paint']?.numericValue;
    const cls = lhr.audits?.['cumulative-layout-shift']?.numericValue;
    rows.push(
      `| \`${path}\` | ${typeof score === 'number' ? Math.round(score * 100) : '—'} | ` +
        `${typeof lcp === 'number' ? (lcp / 1000).toFixed(1) + ' s' : '—'} | ${typeof cls === 'number' ? cls.toFixed(3) : '—'} |`,
    );
  }
  if (files.length === 0) problems.push(`no Lighthouse reports found in ${dir}`);
  return report(
    'Mobile performance budget (median of runs)',
    ['| Page | Perf | LCP | CLS |', '|---|---|---|---|', ...rows],
    problems,
  );
}

async function report(title, lines, problems) {
  const status = problems.length ? `❌ ${problems.length} problem(s)` : '✅ healthy';
  const body = [
    `## ${title}: ${status}`,
    '',
    `Origin: ${ORIGIN} · ${new Date().toISOString()}`,
    '',
    ...lines,
    ...(problems.length ? ['', '### Problems', ...problems.map((p) => `- ${p}`)] : []),
    '',
  ].join('\n');
  process.stdout.write(body);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, body, { flag: 'a' });
  if (problems.length) {
    await writeFile('ops-problems.md', body);
    process.exitCode = 1;
  }
}

const [mode, arg] = process.argv.slice(2);
if (mode === 'smoke') await smoke();
else if (mode === 'perf' && arg) await perf(arg);
else {
  process.stderr.write('usage: prod-check.mjs smoke | perf <lighthouse-json-dir>\n');
  process.exitCode = 2;
}
