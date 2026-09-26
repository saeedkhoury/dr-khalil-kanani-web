/**
 * Opening hours: admin validation, serialisation, and the API routes.
 *
 * The admin rules are STRICTER than the build's: the site may ship with hours
 * "not yet supplied", but a day the doctor marks open from the panel must say
 * when. He was looking at the form when he did it, so a half-filled row is an
 * accident rather than a state anyone chose.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { parseHours, serialiseHours, validateHoursPayload } from '../../workers/admin/src/hours.ts';
import { assertHoursShape, DAY_ORDER } from '../../src/lib/data-schema.ts';

/** A full valid week, overridable per index. */
const week = (over: Record<number, Record<string, unknown>> = {}) =>
  DAY_ORDER.map((day, i) => ({
    day, opens: '09:00', closes: '18:00', closed: false, ...(over[i] ?? {}),
  }));

const issuesOf = (value: unknown): string[] => {
  const result = validateHoursPayload(value);
  assert.equal(result.ok, false, 'expected the payload to be refused');
  return result.ok === false ? result.issues : [];
};

describe('hours validation', () => {
  test('accepts a well-formed week', () => {
    const result = validateHoursPayload(week({ 6: { closed: true, opens: '', closes: '' } }));
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.rows.length, 7);
  });

  test('an open day MUST have both times — stricter than the build schema', () => {
    // The build accepts this (it is the state the site ships in). The panel
    // must not, because from the panel it can only be a mistake.
    const pending = DAY_ORDER.map((day) => ({ day, opens: '', closes: '', closed: false }));
    assert.doesNotThrow(() => assertHoursShape(pending, 'fixture'), 'build schema should accept it');
    assert.ok(issuesOf(pending).includes('row_0_times_required'), 'admin rules must reject it');
  });

  test('a half-filled open day is refused', () => {
    assert.ok(issuesOf(week({ 2: { closes: '' } })).includes('row_2_times_required'));
    assert.ok(issuesOf(week({ 2: { opens: '' } })).includes('row_2_times_required'));
  });

  test('a closed day is normalised, not rejected', () => {
    // The form disables the time inputs when a day is closed, so whatever they
    // last held is meaningless. Blanking them is what ticking the box meant.
    const result = validateHoursPayload(week({ 5: { closed: true, opens: '09:00', closes: '18:00' } }));
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.rows[5], { day: 'Friday', opens: '', closes: '', closed: true });
  });

  test('surrounding whitespace in a time is trimmed', () => {
    const result = validateHoursPayload(week({ 0: { opens: ' 09:00 ', closes: '18:00 ' } }));
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.rows[0].opens, '09:00');
  });

  test('malformed times are refused', () => {
    for (const bad of ['9:00', '0900', '24:00', '08:60', '8am', '', '08:00:00', '١٠:٠٠']) {
      assert.ok(
        issuesOf(week({ 0: { opens: bad } })).some((i) => i.startsWith('row_0_time')),
        `accepted ${bad}`,
      );
    }
  });

  test('opening at or after closing is refused', () => {
    assert.ok(issuesOf(week({ 0: { opens: '18:00', closes: '09:00' } })).includes('row_0_opens_after_closes'));
    assert.ok(issuesOf(week({ 0: { opens: '09:00', closes: '09:00' } })).includes('row_0_opens_after_closes'));
  });

  test('the week must be seven rows in order', () => {
    assert.deepEqual(issuesOf(week().slice(0, 6)), ['wrong_row_count']);
    assert.deepEqual(issuesOf('nope'), ['not_an_array']);
    assert.deepEqual(issuesOf(null), ['not_an_array']);
    const swapped = week();
    [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
    assert.ok(issuesOf(swapped).includes('row_1_wrong_day'));
  });

  test('unknown fields are refused rather than dropped', () => {
    assert.ok(issuesOf(week({ 3: { lunchBreak: '13:00' } })).includes('row_3_unknown_field_lunchBreak'));
  });

  test('every issue is a stable key, never a sentence', () => {
    // The Hebrew the doctor reads lives in the UI, so the Worker carries no
    // display text and the two cannot disagree.
    const issues = issuesOf(week({ 0: { opens: '' }, 3: { closes: 'x' }, 5: { extra: 1 } }));
    assert.ok(issues.length >= 3);
    for (const issue of issues) {
      assert.match(issue, /^[a-z0-9_]+$/i, `"${issue}" is not a machine key`);
    }
  });

  test('validated rows always satisfy the build schema', () => {
    // The anti-drift property: the Worker cannot commit hours the build would
    // reject, which would fail the publication with nothing to diagnose.
    const result = validateHoursPayload(week({ 5: { closed: true }, 6: { closed: true } }));
    assert.equal(result.ok, true);
    assert.doesNotThrow(() => assertHoursShape(result.ok ? result.rows : null, 'check'));
  });
});

describe('serialisation', () => {
  test('matches the formatting the repository already uses', () => {
    const rows = validateHoursPayload(week({ 6: { closed: true } }));
    assert.equal(rows.ok, true);
    const text = serialiseHours(rows.ok ? rows.rows : []);
    assert.ok(text.endsWith('\n'), 'must end with a newline');
    assert.equal(text, `${JSON.stringify(rows.ok ? rows.rows : [], null, 2)}\n`);
    // A CMS commit's diff should show the lines that changed and nothing else.
    assert.match(text, /^\[\n  \{\n    "day": "Sunday",/);
  });

  test('round-trips through parseHours', () => {
    const rows = validateHoursPayload(week({ 6: { closed: true } }));
    const text = serialiseHours(rows.ok ? rows.rows : []);
    assert.deepEqual(parseHours(text), rows.ok ? rows.rows : null);
  });

  test('parseHours refuses a file the build would reject', () => {
    assert.equal(parseHours('{ not json'), null);
    assert.equal(parseHours('[]'), null);
    assert.equal(parseHours('[{"day":"Monday","opens":"","closes":"","closed":false}]'), null);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   The API routes.

   These prove the EXACT request the Worker would send to GitHub — repository,
   branch, path, SHA, encoded content and sanitised commit message — without
   sending it. Nothing reaches github.com; a stub intercepts fetch and records
   what was asked for.
   ──────────────────────────────────────────────────────────────────────── */

import worker from '../../workers/admin/src/index.ts';
import type { Env } from '../../workers/admin/src/http.ts';
import { AUDIENCE, DOCTOR, DEVELOPER, TEAM_DOMAIN, makeToken, jwksDocument } from '../helpers/access-jwt.ts';

const ADMIN_ORIGIN = 'https://admin.drkhalilkanani.test';
const TOKEN = 'ghp_fake_token_for_tests_only_0000000000';

const apiEnv: Env = {
  ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
  ACCESS_AUD: AUDIENCE,
  ADMIN_ORIGIN,
  ALLOWED_EMAILS: `${DOCTOR}, ${DEVELOPER}`,
  GITHUB_TOKEN: TOKEN,
  CONTENT_BRANCH: 'cms-test-branch',
};

interface Recorded { url: string; method: string; body: Record<string, unknown> | null }

/**
 * Stub fetch for the whole request: serve the Access JWKS, and answer GitHub
 * from a queue while recording every call. Any other URL is a test bug.
 */
async function callApi(
  request: Request,
  gitHub: Array<{ status: number; body: unknown }>,
  env: Env = apiEnv,
): Promise<{ response: Response; calls: Recorded[] }> {
  const original = globalThis.fetch;
  const calls: Recorded[] = [];
  let i = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/cdn-cgi/access/certs')) {
      return new Response(JSON.stringify(jwksDocument), { status: 200 });
    }
    if (url.startsWith('https://api.github.com/')) {
      calls.push({
        url,
        method: init?.method ?? 'GET',
        body: init?.body === undefined ? null : JSON.parse(String(init.body)),
      });
      const reply = gitHub[Math.min(i++, gitHub.length - 1)] ?? { status: 500, body: {} };
      return new Response(JSON.stringify(reply.body), { status: reply.status });
    }
    throw new Error(`unexpected network access to ${url}`);
  }) as typeof fetch;
  try {
    return { response: await worker.fetch(request, env), calls };
  } finally {
    globalThis.fetch = original;
  }
}

const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

const CURRENT = [
  { day: 'Sunday', opens: '', closes: '', closed: false },
  { day: 'Monday', opens: '', closes: '', closed: false },
  { day: 'Tuesday', opens: '', closes: '', closed: false },
  { day: 'Wednesday', opens: '', closes: '', closed: false },
  { day: 'Thursday', opens: '', closes: '', closed: false },
  { day: 'Friday', opens: '', closes: '', closed: false },
  { day: 'Saturday', opens: '', closes: '', closed: true },
];

const readReply = (rows: unknown = CURRENT, sha = 'blob-sha-1') => ({
  status: 200,
  body: { content: b64(`${JSON.stringify(rows, null, 2)}\n`), encoding: 'base64', sha },
});

// GitHub's PUT answers with the commit AND the new blob; the blob is what lets
// the editor save a second time without reloading.
const writeReply = { status: 200, body: { commit: { sha: 'commit-abc123' }, content: { sha: 'blob-sha-2' } } };

async function authed(method: string, body?: unknown): Promise<Request> {
  return new Request(`${ADMIN_ORIGIN}/api/hours`, {
    method,
    headers: {
      'Cf-Access-Jwt-Assertion': await makeToken({ email: DOCTOR }),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: ADMIN_ORIGIN }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const SAVE = week({ 5: { closed: true, opens: '', closes: '' }, 6: { closed: true, opens: '', closes: '' } });

describe('GET /api/hours', () => {
  test('returns the current rows and the blob sha', async () => {
    const { response, calls } = await callApi(await authed('GET'), [readReply()]);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { rows: CURRENT, sha: 'blob-sha-1' } });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'GET');
    assert.equal(
      calls[0].url,
      'https://api.github.com/repos/saeedkhoury/dr-khalil-kanani-web/contents/src/data/hours.json?ref=cms-test-branch',
    );
  });

  test('a repository file the build would reject is reported, not rendered', async () => {
    const { response } = await callApi(await authed('GET'), [readReply([{ day: 'Monday' }])]);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok: false, error: { code: 'UPSTREAM_UNAVAILABLE' } });
  });

  test('unauthenticated callers never reach GitHub', async () => {
    const { response, calls } = await callApi(
      new Request(`${ADMIN_ORIGIN}/api/hours`), [readReply()],
    );
    assert.equal(response.status, 401);
    assert.deepEqual(calls, [], 'an unauthenticated request must not touch the repository');
  });
});

describe('PUT /api/hours — the exact request that would be sent', () => {
  test('reads, then writes the validated week with the sha it read', async () => {
    const { response, calls } = await callApi(
      await authed('PUT', { rows: SAVE, sha: 'blob-sha-1' }),
      [readReply(), writeReply],
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { sha: 'commit-abc123', blob: 'blob-sha-2' } });
    assert.equal(calls.length, 2, 'expected one read then one write');

    const [read, put] = calls;
    assert.equal(read.method, 'GET');
    assert.equal(put.method, 'PUT');

    // ── repository and allowed path ──
    assert.equal(
      put.url,
      'https://api.github.com/repos/saeedkhoury/dr-khalil-kanani-web/contents/src/data/hours.json',
    );
    // ── branch: never defaulted to main ──
    assert.equal(put.body?.branch, 'cms-test-branch');
    assert.notEqual(put.body?.branch, 'main');
    // ── expected SHA: the one just read, never client-supplied ──
    assert.equal(put.body?.sha, 'blob-sha-1');
    // ── sanitised commit message: fixed template, no user text ──
    assert.equal(
      put.body?.message,
      'cms(hours): update opening hours\n\nChanged by: CMS admin\n',
    );
    // ── the signed-in address never reaches the public repository ──
    for (const call of calls) {
      assert.ok(!JSON.stringify(call.body ?? {}).includes(DOCTOR), `${call.url} carried the identity`);
    }
    // ── encoded content: exactly the serialised week ──
    const decoded = Buffer.from(String(put.body?.content), 'base64').toString('utf8');
    assert.equal(decoded, `${JSON.stringify(SAVE.map((r) => ({
      day: r.day, opens: r.closed ? '' : r.opens, closes: r.closed ? '' : r.closes, closed: r.closed,
    })), null, 2)}\n`);
    // And the committed bytes must satisfy the build's own schema.
    assert.doesNotThrow(() => assertHoursShape(JSON.parse(decoded), 'committed content'));
  });

  test('a stale form revision is rejected before any write', async () => {
    const { response, calls } = await callApi(
      await authed('PUT', { rows: SAVE, sha: 'old-form-revision' }),
      [readReply(CURRENT, 'new-revision'), writeReply],
    );
    assert.equal(response.status, 409);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'GET');
  });

  test('missing or invalid revision cannot perform an unconditional write', async () => {
    for (const sha of [undefined, null, '', 42, 'a'.repeat(65)]) {
      const { response, calls } = await callApi(await authed('PUT', { rows: SAVE, sha }), [readReply(), writeReply]);
      assert.equal(response.status, 409);
      assert.equal(calls.length, 0);
    }
  });

  test('an invalid week is refused with machine keys and never written', async () => {
    const { response, calls } = await callApi(
      await authed('PUT', { rows: week({ 0: { closes: '' } }) }),
      [readReply(), writeReply],
    );
    assert.equal(response.status, 422);
    const body = await response.json() as { error: { code: string; issues: string[] } };
    assert.equal(body.error.code, 'INVALID');
    assert.ok(body.error.issues.includes('row_0_times_required'));
    assert.deepEqual(calls, [], 'a refused payload must not reach GitHub');
  });

  test('a race after the server read returns conflict without retry or overwrite', async () => {
    const { response, calls } = await callApi(
      await authed('PUT', { rows: SAVE, sha: 'blob-sha-1' }),
      [readReply(), { status: 409, body: {} }, readReply(CURRENT, 'fresh'), writeReply],
    );
    assert.equal(response.status, 409);
    assert.equal(calls.length, 2, 'must not re-read and overwrite the new revision');
  });

  test('an unconfigured token or branch refuses without calling GitHub', async () => {
    for (const missing of [{ GITHUB_TOKEN: undefined }, { CONTENT_BRANCH: undefined }]) {
      const { response, calls } = await callApi(
        await authed('PUT', { rows: SAVE, sha: 'blob-sha-1' }), [readReply(), writeReply],
        { ...apiEnv, ...missing } as Env,
      );
      assert.equal(response.status, 503, JSON.stringify(missing));
      assert.deepEqual(await response.json(), { ok: false, error: { code: 'NOT_CONFIGURED' } });
      assert.deepEqual(calls, []);
    }
  });
});

describe('PUT /api/hours — request hygiene', () => {
  test('a cross-origin write is refused', async () => {
    const request = new Request(`${ADMIN_ORIGIN}/api/hours`, {
      method: 'PUT',
      headers: {
        'Cf-Access-Jwt-Assertion': await makeToken({ email: DOCTOR }),
        'Content-Type': 'application/json',
        Origin: 'https://evil.test',
      },
      body: JSON.stringify({ rows: SAVE, sha: 'blob-sha-1' }),
    });
    const { response, calls } = await callApi(request, [readReply(), writeReply]);
    assert.equal(response.status, 403);
    assert.deepEqual(calls, []);
  });

  test('a missing Origin on a write is refused', async () => {
    const request = new Request(`${ADMIN_ORIGIN}/api/hours`, {
      method: 'PUT',
      headers: {
        'Cf-Access-Jwt-Assertion': await makeToken({ email: DOCTOR }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rows: SAVE, sha: 'blob-sha-1' }),
    });
    const { response, calls } = await callApi(request, [readReply(), writeReply]);
    assert.equal(response.status, 403);
    assert.deepEqual(calls, []);
  });

  test('a body that is not declared JSON is refused', async () => {
    const request = new Request(`${ADMIN_ORIGIN}/api/hours`, {
      method: 'PUT',
      headers: {
        'Cf-Access-Jwt-Assertion': await makeToken({ email: DOCTOR }),
        'Content-Type': 'text/plain',
        Origin: ADMIN_ORIGIN,
      },
      body: JSON.stringify({ rows: SAVE, sha: 'blob-sha-1' }),
    });
    const { response, calls } = await callApi(request, [readReply(), writeReply]);
    assert.equal(response.status, 400);
    assert.deepEqual(calls, []);
  });

  test('an oversized body is refused before parsing', async () => {
    const request = new Request(`${ADMIN_ORIGIN}/api/hours`, {
      method: 'PUT',
      headers: {
        'Cf-Access-Jwt-Assertion': await makeToken({ email: DOCTOR }),
        'Content-Type': 'application/json',
        Origin: ADMIN_ORIGIN,
      },
      body: JSON.stringify({ rows: SAVE, padding: 'x'.repeat(9000) }),
    });
    const { response, calls } = await callApi(request, [readReply(), writeReply]);
    assert.equal(response.status, 413);
    assert.deepEqual(calls, []);
  });

  test('malformed JSON is refused', async () => {
    const request = new Request(`${ADMIN_ORIGIN}/api/hours`, {
      method: 'PUT',
      headers: {
        'Cf-Access-Jwt-Assertion': await makeToken({ email: DOCTOR }),
        'Content-Type': 'application/json',
        Origin: ADMIN_ORIGIN,
      },
      body: '{ not json',
    });
    const { response, calls } = await callApi(request, [readReply(), writeReply]);
    assert.equal(response.status, 400);
    assert.deepEqual(calls, []);
  });

  test('the GitHub token never appears in a response', async () => {
    for (const replies of [[readReply(), writeReply], [{ status: 401, body: { message: TOKEN } }]]) {
      const { response } = await callApi(await authed('PUT', { rows: SAVE, sha: 'blob-sha-1' }), replies);
      assert.ok(!(await response.text()).includes(TOKEN));
    }
  });
});
