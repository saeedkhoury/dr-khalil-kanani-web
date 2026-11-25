/**
 * The read-only production watch (.github/workflows/scheduled-check.yml).
 *
 * These checks decide when the owner gets an alert issue, so they must fail on
 * real breakage and stay quiet otherwise. They never pin page text: the doctor
 * edits content in Edit Mode, and a content change must not look like an outage.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  PAGES,
  SLOW_MS,
  DEPLOY_GRACE_MIN,
  PERF_BUDGET,
  evaluatePage,
  evaluateBuild,
  evaluateLighthouse,
  evaluateRelay,
  relayEndpointFrom,
  medianRun,
} from '../../scripts/ops/checks.mjs';

const html = (lang: string, dir: string) =>
  `<!doctype html><html lang="${lang}" dir="${dir}" class="no-js"><body>anything</body></html>`;

describe('page checks', () => {
  test('covers the three locale home pages', () => {
    assert.deepEqual(PAGES, ['/he/', '/ar/', '/en/']);
  });

  test('a fast 200 with the right lang and dir passes, whatever the content', () => {
    assert.deepEqual(evaluatePage({ path: '/he/', status: 200, ms: 400, html: html('he', 'rtl') }), []);
    assert.deepEqual(evaluatePage({ path: '/ar/', status: 200, ms: 400, html: html('ar', 'rtl') }), []);
    assert.deepEqual(evaluatePage({ path: '/en/', status: 200, ms: 400, html: html('en', 'ltr') }), []);
  });

  test('a non-200 is reported and skips the markup checks', () => {
    const problems = evaluatePage({ path: '/ar/', status: 503, ms: 100, html: '' });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /\/ar\/.*503/);
  });

  test('a slow response is reported', () => {
    const problems = evaluatePage({ path: '/en/', status: 200, ms: SLOW_MS + 1, html: html('en', 'ltr') });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /slow/);
  });

  test('a broken direction is reported (an RTL page served LTR)', () => {
    const problems = evaluatePage({ path: '/he/', status: 200, ms: 300, html: html('he', 'ltr') });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /dir/);
  });

  test('a wrong or missing lang is reported', () => {
    assert.equal(evaluatePage({ path: '/ar/', status: 200, ms: 300, html: html('en', 'rtl') }).length, 1);
    assert.equal(evaluatePage({ path: '/ar/', status: 200, ms: 300, html: '<html><body></body></html>' }).length, 2);
  });

  test('non-locale paths only need a 200', () => {
    assert.deepEqual(evaluatePage({ path: '/robots.txt', status: 200, ms: 200, html: 'User-agent: *' }), []);
  });
});

describe('deployed build', () => {
  const sha = 'a'.repeat(40);
  const other = 'b'.repeat(40);

  test('production serving the tip of main passes', () => {
    assert.deepEqual(evaluateBuild({ live: `${sha}\n`, expected: sha, commitAgeMin: 600 }), []);
  });

  test('a fresh commit still deploying is not an alert', () => {
    assert.deepEqual(evaluateBuild({ live: other, expected: sha, commitAgeMin: DEPLOY_GRACE_MIN - 1 }), []);
  });

  test('main ahead of production after the grace period is an alert', () => {
    const problems = evaluateBuild({ live: other, expected: sha, commitAgeMin: DEPLOY_GRACE_MIN + 1 });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /bbbbbbb.*aaaaaaa/);
  });

  test('an unreadable build stamp is an alert', () => {
    assert.equal(evaluateBuild({ live: '<html>404</html>', expected: sha, commitAgeMin: 600 }).length, 1);
  });
});

describe('appointment email relay', () => {
  test('a 204 preflight means the relay is up (no email is sent)', () => {
    assert.deepEqual(evaluateRelay({ status: 204 }), []);
  });

  test('anything else is an alert: enquiries may be failing', () => {
    for (const status of [0, 403, 404, 500, 503]) {
      const problems = evaluateRelay({ status });
      assert.equal(problems.length, 1, String(status));
      assert.match(problems[0], /relay/);
    }
  });

  test('the relay endpoint is read from clinic.ts, the single source of truth', () => {
    const src = "  requestEndpoint: 'https://relay.example.workers.dev' as string,";
    assert.equal(relayEndpointFrom(src), 'https://relay.example.workers.dev');
    assert.equal(relayEndpointFrom("  requestEndpoint: '' as string,"), '');
    assert.equal(relayEndpointFrom('no endpoint here'), '');
  });
});

describe('performance budget', () => {
  const lhr = (score: number, lcp: number, cls: number) => ({
    categories: { performance: { score } },
    audits: {
      'largest-contentful-paint': { numericValue: lcp },
      'cumulative-layout-shift': { numericValue: cls },
    },
  });

  test('within budget passes', () => {
    assert.deepEqual(evaluateLighthouse('/he/', lhr(0.97, 1400, 0)), []);
  });

  test('each breached metric is reported', () => {
    const problems = evaluateLighthouse('/he/', lhr(PERF_BUDGET.performance - 0.01, PERF_BUDGET.lcpMs + 1, PERF_BUDGET.cls + 0.01));
    assert.equal(problems.length, 3);
  });

  test('a run with no score (Lighthouse error) is reported, not passed', () => {
    const problems = evaluateLighthouse('/ar/', { categories: { performance: { score: null } }, audits: {} });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /no performance score/);
  });
});

describe('median of several Lighthouse runs', () => {
  type Run = {
    categories: { performance: { score: number | null } };
    audits: { 'largest-contentful-paint'?: { numericValue: number } };
  };
  const run = (lcp: number, score = 0.95): Run => ({
    categories: { performance: { score } },
    audits: { 'largest-contentful-paint': { numericValue: lcp } },
  });

  test('picks the run with the median LCP, so one cold fetch cannot raise an alert', () => {
    assert.equal(medianRun([run(1300), run(3300), run(1400)]).audits['largest-contentful-paint']?.numericValue, 1400);
  });

  test('a real slowdown in most runs still surfaces', () => {
    assert.equal(medianRun([run(3100), run(1200), run(3300)]).audits['largest-contentful-paint']?.numericValue, 3100);
  });

  test('failed runs (no score) count as slowest, and all-failed stays failed', () => {
    const failed: Run = { categories: { performance: { score: null } }, audits: {} };
    assert.equal(medianRun([failed, run(1500), run(1600)]).audits['largest-contentful-paint']?.numericValue, 1600);
    assert.equal(medianRun([failed, failed, failed]).categories.performance.score, null);
  });

  test('a single run is returned as is', () => {
    assert.equal(medianRun([run(2000)]).audits['largest-contentful-paint']?.numericValue, 2000);
  });
});
