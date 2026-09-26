/**
 * Admin Worker transport layer: response shapes and security headers.
 *
 * These assert the guarantees every other admin test relies on — that a
 * failure carries a code and nothing else, and that the header set is applied
 * to errors as well as successes.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { ok, fail, SECURITY_HEADERS, type ErrorCode } from '../../workers/admin/src/http.ts';

/**
 * Every code, with its status. Typed as Record<ErrorCode, number>, so adding
 * a code to the union without adding it here fails the typecheck — which is
 * how this list stays exhaustive rather than merely long.
 */
const EXPECTED_STATUS: Record<ErrorCode, number> = {
  AUTH_REQUIRED: 401,
  AUTH_INVALID: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  SERVER_ERROR: 500,
  BAD_REQUEST: 400,
  INVALID: 422,
  PAYLOAD_TOO_LARGE: 413,
  CONFLICT: 409,
  UPSTREAM_UNAVAILABLE: 502,
  NOT_CONFIGURED: 503,
};

const ALL_CODES = Object.keys(EXPECTED_STATUS) as ErrorCode[];

describe('admin transport layer', () => {
  test('a success carries ok:true and the data, nothing else', async () => {
    const response = ok({ authenticated: true });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, data: { authenticated: true } });
  });

  test('every error code maps to its status and carries only the code', async () => {
    for (const code of ALL_CODES) {
      const response = fail(code);
      assert.equal(response.status, EXPECTED_STATUS[code], `${code} status`);
      // Exactly this shape. No message, no detail, no cause.
      assert.deepEqual(await response.json(), { ok: false, error: { code } });
    }
  });

  test('security headers are present on success', () => {
    const response = ok({});
    for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
      assert.equal(response.headers.get(header), value, `missing ${header}`);
    }
  });

  test('security headers are present on every error, not just success', () => {
    // An error body is still something a browser can be made to render.
    for (const code of ALL_CODES) {
      const response = fail(code);
      for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
        assert.equal(response.headers.get(header), value, `${code} missing ${header}`);
      }
    }
  });

  test('responses are never cached', () => {
    // Per-identity data. A cached copy on a shared device is an identity leak.
    for (const response of [ok({}), ...ALL_CODES.map((code) => fail(code))]) {
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
  });

  test('no CORS header is ever emitted', () => {
    // The admin UI is same-origin. The ABSENCE of these headers is what
    // refuses a cross-origin caller, so their absence is a tested guarantee.
    for (const response of [ok({}), ...ALL_CODES.map((code) => fail(code))]) {
      for (const header of [
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Credentials',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers',
      ]) {
        assert.equal(response.headers.get(header), null, `${header} must not be set`);
      }
    }
  });

  test('HSTS is not set by the Worker', () => {
    // Deferred deliberately: HSTS belongs to the hostname, not to the subset
    // of responses this Worker generates.
    assert.equal(ok({}).headers.get('Strict-Transport-Security'), null);
  });

  test('the CSP permits nothing and cannot be framed', () => {
    const csp = ok({}).headers.get('Content-Security-Policy') ?? '';
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /base-uri 'none'/);
    assert.match(csp, /form-action 'none'/);
  });

  test('the header set cannot be mutated at runtime', () => {
    // One shared frozen object; a handler cannot weaken headers for its own
    // response and leave every other response looking fine.
    assert.throws(() => {
      (SECURITY_HEADERS as Record<string, string>)['Cache-Control'] = 'public, max-age=31536000';
    });
    assert.equal(ok({}).headers.get('Cache-Control'), 'no-store');
  });
});
