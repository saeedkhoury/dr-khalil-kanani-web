/**
 * Pure decisions for the read-only production watch.
 *
 * Each function takes measurements and returns a list of human-readable
 * problems; an empty list means healthy. Nothing here fetches or writes, so the
 * thresholds are unit-tested (tests/unit/ops-checks.test.ts) and the runner
 * (prod-check.mjs) stays a thin shell around them.
 *
 * Never check page text: the doctor edits content in Edit Mode, and a content
 * change must not look like an outage. Check status, speed, lang and dir only.
 */

export const PAGES = ['/he/', '/ar/', '/en/'];
export const EXTRA_PATHS = ['/robots.txt', '/sitemap-index.xml'];

/** A locale page slower than this (whole response, from a CI runner) is reported. */
export const SLOW_MS = 3000;

/** A deploy takes ~4–5 min; allow retries before calling a stale build an alert. */
export const DEPLOY_GRACE_MIN = 45;

/** Mobile Lighthouse budget. Baseline 2026-11-24: perf 97–100, LCP 1.1–1.4 s. */
export const PERF_BUDGET = { performance: 0.9, lcpMs: 2500, cls: 0.1 };

const LOCALE_DIR = { he: 'rtl', ar: 'rtl', en: 'ltr' };

const htmlTag = (html) => (html.match(/<html\b[^>]*>/i) || [''])[0];
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i')) || [])[1];

/**
 * @param {{ path: string, status: number, ms: number, html: string }} page
 * @returns {string[]}
 */
export function evaluatePage({ path, status, ms, html }) {
  if (status !== 200) return [`${path}: HTTP ${status}`];

  const problems = [];
  if (ms > SLOW_MS) problems.push(`${path}: slow response (${Math.round(ms)} ms > ${SLOW_MS} ms)`);

  const locale = path.split('/')[1];
  const expectedDir = LOCALE_DIR[locale];
  if (!expectedDir) return problems;

  const tag = htmlTag(html);
  const lang = attr(tag, 'lang');
  const dir = attr(tag, 'dir');
  if (lang !== locale) problems.push(`${path}: <html lang> is "${lang ?? 'missing'}", expected "${locale}"`);
  if (dir !== expectedDir) problems.push(`${path}: <html dir> is "${dir ?? 'missing'}", expected "${expectedDir}"`);
  return problems;
}

/**
 * Production serves /build.txt with the commit it was built from (deploy.yml).
 *
 * @param {{ live: string, expected: string, commitAgeMin: number }} build
 * @returns {string[]}
 */
export function evaluateBuild({ live, expected, commitAgeMin }) {
  const sha = String(live).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) return ['/build.txt: not a commit SHA (deploy stamp missing or broken)'];
  if (sha === expected || commitAgeMin < DEPLOY_GRACE_MIN) return [];
  return [
    `production serves ${sha.slice(0, 7)}, but main is ${expected.slice(0, 7)} ` +
      `(${Math.round(commitAgeMin)} min old): the latest deploy did not go live`,
  ];
}

/**
 * The appointment relay (workers/appointment-email) is probed with a CORS
 * preflight: OPTIONS → 204 proves it is up without sending any email.
 *
 * @param {{ status: number }} probe
 * @returns {string[]}
 */
export function evaluateRelay({ status }) {
  if (status === 204) return [];
  return [`appointment relay preflight returned ${status || 'no response'} (expected 204): enquiries may be failing`];
}

/**
 * Read `requestEndpoint` from src/data/clinic.ts so the URL lives in one place.
 *
 * @param {string} source contents of clinic.ts
 * @returns {string} the endpoint, or '' when unset
 */
export function relayEndpointFrom(source) {
  return (source.match(/requestEndpoint:\s*'([^']*)'/) || [])[1] ?? '';
}

/**
 * The run with the median LCP. A single Lighthouse run is noisy: right after a
 * deploy the CDN copy is cold and one slow fetch can double LCP. Judging the
 * median of several runs keeps the budget about the site, not one request.
 * Failed runs (no score) sort as slowest, so all-failed stays failed.
 *
 * @param {object[]} runs Lighthouse JSON results for one page
 * @returns {object} the median run
 */
export function medianRun(runs) {
  const lcp = (r) =>
    typeof r?.categories?.performance?.score === 'number'
      ? (r.audits?.['largest-contentful-paint']?.numericValue ?? Infinity)
      : Infinity;
  const sorted = [...runs].sort((a, b) => lcp(a) - lcp(b));
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/**
 * @param {string} path
 * @param {{ categories?: object, audits?: object }} lhr Lighthouse JSON result
 * @returns {string[]}
 */
export function evaluateLighthouse(path, lhr) {
  const score = lhr?.categories?.performance?.score;
  if (typeof score !== 'number') return [`${path}: no performance score (Lighthouse run failed)`];

  const problems = [];
  const lcp = lhr.audits?.['largest-contentful-paint']?.numericValue;
  const cls = lhr.audits?.['cumulative-layout-shift']?.numericValue;
  if (score < PERF_BUDGET.performance) {
    problems.push(`${path}: performance ${Math.round(score * 100)} < ${PERF_BUDGET.performance * 100}`);
  }
  if (typeof lcp === 'number' && lcp > PERF_BUDGET.lcpMs) {
    problems.push(`${path}: LCP ${(lcp / 1000).toFixed(1)} s > ${PERF_BUDGET.lcpMs / 1000} s`);
  }
  if (typeof cls === 'number' && cls > PERF_BUDGET.cls) {
    problems.push(`${path}: CLS ${cls.toFixed(3)} > ${PERF_BUDGET.cls}`);
  }
  return problems;
}
