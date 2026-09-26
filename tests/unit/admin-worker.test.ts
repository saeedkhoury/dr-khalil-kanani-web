/**
 * Admin Worker end to end: routing, /api/session, and the guarantees that
 * must hold across EVERY response it can produce.
 *
 * The auth unit tests prove verification is correct. These prove the Worker
 * wires it in without leaking anything — that no response carries a token, a
 * configuration value, or a hint about which check failed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import worker from '../../workers/admin/src/index.ts';
import { SECURITY_HEADERS, type Env } from '../../workers/admin/src/http.ts';
import {
  AUDIENCE, DOCTOR, DEVELOPER, STRANGER, TEAM_DOMAIN,
  makeAlgNoneToken, makeTamperedToken, makeToken,
  requestWithCookieOnly, requestWithToken, requestWithout, withStubbedJwks,
} from '../helpers/access-jwt.ts';

/**
 * index.ts deliberately offers NO seam for substituting keys — there must be
 * no way in from a request, so the Worker always resolves its own key set
 * from ACCESS_TEAM_DOMAIN.
 *
 * Tests therefore stub global `fetch` instead, serving a locally generated
 * JWKS to the certs URL and REFUSING everything else. Nothing leaves the
 * machine, nothing depends on DNS, and the production verification path runs
 * unchanged — including the success case, end to end through fetch().
 */
const env: Env = {
  ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
  ACCESS_AUD: AUDIENCE,
  ADMIN_ORIGIN: 'https://admin.drkhalilkanani.test',
  ALLOWED_EMAILS: `${DOCTOR}, ${DEVELOPER}`,
};

/** Call the Worker with the key server stubbed and reachable. */
async function call(request: Request, e: Env = env): Promise<Response> {
  const { result } = await withStubbedJwks(() => worker.fetch(request, e));
  return result;
}

/**
 * Source with comments removed.
 *
 * The structural checks below are about CODE. Matching raw source also
 * matches the prose explaining why a thing is absent — a comment saying
 * "there is no bypass" would fail a test looking for the word "bypass",
 * which would be the test reporting on its own vocabulary rather than on
 * the Worker.
 */
async function codeOf(file: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL(`../../workers/admin/src/${file}`, import.meta.url), 'utf8');
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('routing', () => {
  test('an unknown route is 404 and costs no authentication', async () => {
    for (const path of ['/api', '/api/unknown', '/api/session/']) {
      const response = await call(requestWithout({ path }));
      assert.equal(response.status, 404, path);
      assert.deepEqual(await response.json(), { ok: false, error: { code: 'NOT_FOUND' } });
    }
    for (const path of ['/admin', '/.env', '/index.html']) {
      const response = await call(requestWithout({ path }));
      assert.equal(response.status, 401, `${path} escaped asset authentication`);
    }
  });

  test('a known route with the wrong method is 405', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']) {
      const response = await call(requestWithout({ method, path: '/api/session' }));
      assert.equal(response.status, 405, method);
      assert.deepEqual(await response.json(), { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } });
    }
  });

  test('OPTIONS is refused rather than given a CORS grant', async () => {
    // Same-origin requests do not preflight, so an OPTIONS arriving means a
    // cross-origin caller.
    const response = await call(requestWithout({ method: 'OPTIONS', path: '/api/session' }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    assert.equal(response.headers.get('Access-Control-Allow-Methods'), null);
  });

  test('method and route are checked before authentication', async () => {
    // A bad method on a real route answers 405, not 401 — proving the cheap
    // rejection happens first and no crypto was attempted.
    const response = await call(requestWithout({ method: 'DELETE', path: '/api/session' }));
    assert.equal(response.status, 405);
  });
});

describe('/api/session fails closed', () => {
  test('no credential is 401 AUTH_REQUIRED', async () => {
    const response = await call(requestWithout());
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, error: { code: 'AUTH_REQUIRED' } });
  });

  test('a cookie-only request is refused', async () => {
    const response = await call(requestWithCookieOnly(await makeToken({ email: DOCTOR })));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, error: { code: 'AUTH_REQUIRED' } });
  });

  test('an unreachable key server authenticates nobody', async () => {
    // Fail CLOSED. If the key set cannot be fetched, nobody is authenticated
    // — the panel becoming unavailable is acceptable, open is not.
    //
    // A distinct team domain, so this cannot be answered from the key set
    // cached by the other tests.
    const isolated: Env = { ...env, ACCESS_TEAM_DOMAIN: 'unreachable.cloudflareaccess.test' };
    const request = requestWithToken(await makeToken({ email: DOCTOR }));
    const { result } = await withStubbedJwks(
      () => worker.fetch(request, isolated),
      { fail: true },
    );
    assert.equal(result.status, 401);
    assert.deepEqual(await result.json(), { ok: false, error: { code: 'AUTH_INVALID' } });
  });

  test('a valid allow-listed identity is accepted end to end', async () => {
    // The one happy path, through the real fetch handler.
    const response = await call(requestWithToken(await makeToken({ email: DOCTOR })));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      data: { authenticated: true, email: DOCTOR, publishing: 'test' },
    });
  });

  test('the response carries exactly three data fields', async () => {
    const response = await call(requestWithToken(await makeToken({ email: DOCTOR })));
    const body = await response.json() as { data: Record<string, unknown> };
    // publishing is derived from the configured branch, never from the token.
    assert.deepEqual(Object.keys(body.data).sort(), ['authenticated', 'email', 'publishing']);
  });

  test('a valid identity that is not allow-listed is refused', async () => {
    const response = await call(requestWithToken(await makeToken({ email: STRANGER })));
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { ok: false, error: { code: 'FORBIDDEN' } });
  });

  test('no unit test in this file reaches the network', async () => {
    // The stub records any attempt to fetch something other than the JWKS.
    const { notFetched } = await withStubbedJwks(async () => {
      await worker.fetch(requestWithToken(await makeToken({ email: DOCTOR })), env);
      await worker.fetch(requestWithout(), env);
    });
    assert.deepEqual(notFetched, []);
  });

  test('every malformed or hostile token is refused with one indistinguishable answer', async () => {
    const tokens = [
      'not.a.jwt',
      'garbage',
      await makeToken({ signWithForeignKey: true }),
      await makeTamperedToken(),
      await makeToken({ expiresInSeconds: -3600 }),
      await makeToken({ notBeforeSeconds: 3600 }),
      await makeToken({ issuer: 'https://attacker.cloudflareaccess.test' }),
      await makeToken({ audience: 'another-app' }),
      await makeToken({ kid: 'unpublished' }),
      makeAlgNoneToken(),
      await makeToken({ email: null }),
    ];
    // STRANGER is deliberately NOT here. A valid identity that is simply not
    // allow-listed is a different class of answer (403 FORBIDDEN) and SHOULD
    // be distinguishable: it tells someone who got through Access that they
    // are not on the list. What must be indistinguishable is which
    // VERIFICATION check failed.

    const answers = new Set<string>();
    for (const token of tokens) {
      const response = await call(requestWithToken(token));
      answers.add(`${response.status} ${await response.text()}`);
    }
    assert.equal(answers.size, 1, `expected one indistinguishable answer, got:\n${[...answers].join('\n')}`);
  });
});

describe('nothing sensitive leaves the Worker', () => {
  /** Every response this Worker can produce, as text, for blanket assertions. */
  async function allResponses(): Promise<Array<{ label: string; status: number; body: string; headers: Headers }>> {
    const token = await makeToken({ email: DOCTOR });
    const cases: Array<[string, Request]> = [
      ['no credential', requestWithout()],
      ['cookie only', requestWithCookieOnly(token)],
      ['valid-shaped token', requestWithToken(token)],
      ['malformed token', requestWithToken('not.a.jwt')],
      ['alg none', requestWithToken(makeAlgNoneToken())],
      ['expired', requestWithToken(await makeToken({ expiresInSeconds: -3600 }))],
      ['unknown route', requestWithout({ path: '/api/unknown' })],
      ['bad method', requestWithout({ method: 'POST' })],
    ];
    const out = [];
    for (const [label, request] of cases) {
      const response = await call(request);
      out.push({ label, status: response.status, body: await response.text(), headers: response.headers });
    }
    return out;
  }

  test('no response ever contains the assertion token', async () => {
    const token = await makeToken({ email: DOCTOR });
    for (const { label, body } of await allResponses()) {
      assert.ok(!body.includes(token), `${label} leaked the token`);
      // Nor any JWT-shaped fragment.
      assert.ok(!/eyJ[A-Za-z0-9_-]{10,}/.test(body), `${label} contains a JWT-shaped string`);
    }
  });

  test('no response ever contains a configuration value', async () => {
    // A standing guarantee: a future field that echoes config fails here.
    const secrets = [env.ACCESS_AUD, env.ACCESS_TEAM_DOMAIN, env.ALLOWED_EMAILS!, DEVELOPER];
    for (const { label, body } of await allResponses()) {
      for (const value of secrets) {
        assert.ok(!body.includes(value), `${label} leaked ${value}`);
      }
    }
  });

  test('no response contains verification internals or a stack trace', async () => {
    for (const { label, body } of await allResponses()) {
      for (const leak of ['JWSSignatureVerificationFailed', 'ERR_JOSE', 'JWTExpired', 'at Object.', '.ts:', 'signature', 'jwks']) {
        assert.ok(!body.toLowerCase().includes(leak.toLowerCase()), `${label} leaked "${leak}"`);
      }
    }
  });

  test('every response carries the full security header set', async () => {
    for (const { label, headers } of await allResponses()) {
      for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
        assert.equal(headers.get(header), value, `${label} missing ${header}`);
      }
    }
  });

  test('no response carries a CORS header or HSTS', async () => {
    for (const { label, headers } of await allResponses()) {
      for (const header of [
        'Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials',
        'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers',
        'Strict-Transport-Security',
      ]) {
        assert.equal(headers.get(header), null, `${label} set ${header}`);
      }
    }
  });

  test('every error body is exactly {ok,error:{code}} and nothing more', async () => {
    for (const { label, status, body } of await allResponses()) {
      if (status === 200) continue;
      const parsed = JSON.parse(body);
      assert.deepEqual(Object.keys(parsed).sort(), ['error', 'ok'], label);
      assert.deepEqual(Object.keys(parsed.error), ['code'], `${label} error carries extra fields`);
    }
  });
});

describe('no authentication bypass exists', () => {
  test('no environment value can turn authentication off', async () => {
    // Every plausible bypass name, plus the real config blanked. None may
    // produce a 200 on a request with no credential.
    const attempts: Array<Record<string, string>> = [
      { DEV_AUTH_BYPASS: '1' }, { SKIP_AUTH: 'true' }, { LOCAL_AUTH: '1' },
      { ALLOW_ALL: '1' }, { ENVIRONMENT: 'development' }, { NODE_ENV: 'development' },
      { DEBUG: '1' }, { CF_ACCESS_DISABLED: 'true' },
    ];
    for (const extra of attempts) {
      const response = await call(requestWithout(), { ...env, ...extra } as Env);
      assert.equal(response.status, 401, `bypassed with ${JSON.stringify(extra)}`);
    }
  });

  test('the Worker code contains no bypass construct', async () => {
    // Structural, because the behavioural tests can only cover names we
    // thought of. Comments are stripped so this reports on the code.
    for (const file of ['index.ts', 'auth.ts', 'http.ts']) {
      const code = await codeOf(file);
      for (const pattern of [
        /DEV_AUTH_BYPASS/i, /SKIP_AUTH/i, /ALLOW_ALL/i, /LOCAL_AUTH/i, /bypass/i,
        /process\.env/, /NODE_ENV/, /\bisDev\b/i, /globalThis\./,
      ]) {
        assert.ok(!pattern.test(code), `${file} contains ${pattern}`);
      }
    }
  });

  test('authentication is not conditional on anything', async () => {
    // authenticate() must be called unconditionally once a route matches --
    // never inside an if, and never with its result ignored.
    const code = await codeOf('index.ts');
    assert.match(code, /const auth = await authenticate\(request, env\);/);
    assert.match(code, /if \(!auth\.ok\)/);
    // The key-source seam exists in auth.ts, and the entry point must never
    // pass it -- a third argument here would be a way in from outside.
    assert.ok(!/authenticate\([^)]*,[^)]*,[^)]*\)/.test(code), 'index.ts passes a key override');
  });

  test('ALLOWED_EMAILS unset refuses a perfectly valid token', async () => {
    // Correctly signed, unexpired, right issuer, right audience, real
    // identity — and still refused, because nobody has said who may in.
    const { ALLOWED_EMAILS: _omitted, ...withoutList } = env;
    for (const list of [undefined, '', '   ', ',,,']) {
      const e = { ...withoutList, ...(list === undefined ? {} : { ALLOWED_EMAILS: list }) } as Env;
      const response = await call(requestWithToken(await makeToken({ email: DOCTOR })), e);
      assert.equal(response.status, 403, `admitted with ALLOWED_EMAILS=${JSON.stringify(list)}`);
      assert.deepEqual(await response.json(), { ok: false, error: { code: 'FORBIDDEN' } });
    }
  });
});

describe('/api/session contract', () => {
  test('the route table exposes exactly the intended paths', async () => {
    // A guard against an endpoint being added without a decision. If this
    // fails, a route was introduced -- make sure it was meant to be, then
    // update this list deliberately.
    const code = await codeOf('index.ts');
    const paths = [...code.matchAll(/^\s*'(\/[^']*)':\s*\{/gm)].map((m) => m[1]);
    assert.deepEqual(paths, [
      '/visual-editor.js', '/visual-editor.css', '/panel', '/panel.js', '/panel.css',
      '/api/session', '/api/hours',
      '/api/content/services', '/api/content/faq', '/api/content/doctor', '/api/content/copy', '/api/content/contact',
      '/api/photos',
      '/api/photos/publish', '/api/photos/unpublish', '/api/photo', '/api/photos/order', '/api/photos/replace', '/api/photos/describe', '/api/photos/stage', '/api/photos/save', '/api/photos/delete',
      '/api/status', '/api/status/latest',
    ]);
  });

  test('the session handler returns only authenticated, email and publishing mode', async () => {
    const code = await codeOf('index.ts');
    // No token claim other than the email may be referenced anywhere in the
    // routing layer. Word-bounded, so `validated.issues` is not mistaken for
    // the `iss` claim.
    for (const claim of [/\bpayload\b/, /\.sub\b/, /\.iat\b/, /\.exp\b/, /\.nbf\b/, /\.aud\b/, /\.iss\b/, /\bjwt\b/i, /Assertion/]) {
      assert.ok(!claim.test(code), `the routing layer references ${claim}`);
    }
    assert.match(code, /ok\(\{\s*authenticated: true,\s*email: identity\.email,\s*publishing: env\.CONTENT_BRANCH\?\.trim\(\) === 'main' \? 'production' : 'test',\s*\}\)/);
  });

  test('the identity carries nothing but the email', async () => {
    // Enforced at the type level in auth.ts, asserted here so a later added
    // field is a deliberate act rather than an accident.
    const code = await codeOf('auth.ts');
    const shape = code.match(/export interface AccessIdentity \{([\s\S]*?)\}/);
    assert.ok(shape, 'AccessIdentity not found');
    const fields = shape[1].split('\n').map((l) => l.trim()).filter(Boolean);
    assert.deepEqual(fields, ['email: string;']);
  });
});
