/**
 * TRANSPORT LAYER — environment typing, response shapes, security headers.
 *
 * Kept apart from routing and from verification so that the answer to "what
 * can this Worker ever say to a browser?" is one short file you can read in
 * full. Every response the admin Worker produces is built here; there is no
 * other `new Response(...)` in the Worker.
 */

/**
 * Everything the admin Worker is allowed to know.
 *
 * GITHUB_TOKEN is deliberately ABSENT. This Worker cannot write to GitHub, and
 * a Worker that cannot name a credential cannot leak one. It is added in the
 * phase that writes content, not before — typing it early is how a
 * "temporary" binding appears.
 */
export interface Env {
  /** `<team>.cloudflareaccess.com`. Issuer and JWKS URL are derived from it. */
  ACCESS_TEAM_DOMAIN: string;
  /** The Access application's AUD tag. An identifier, not a credential. */
  ACCESS_AUD: string;
  /** This Worker's own public origin. */
  ADMIN_ORIGIN: string;
  /**
   * Comma-separated identities permitted to use the panel.
   *
   * OPTIONAL IN THE TYPE ON PURPOSE. Unset is a state the Worker must handle,
   * and it must handle it by refusing everyone. Typing it as required would
   * let the compiler imply a guarantee the deployment does not make.
   */
  ALLOWED_EMAILS?: string;

  /**
   * Fine-grained GitHub PAT: ONE repository, `Contents: Read and write`, and
   * nothing else. No workflow, actions, packages, account or org scope.
   *
   * Optional in the type because unset is a real deployment state and must be
   * handled by refusing, not by assuming. Used only to build an Authorization
   * header — never returned, never logged, never put in a message.
   */
  GITHUB_TOKEN?: string;

  /**
   * Branch the CMS commits to.
   *
   * DELIBERATELY HAS NO DEFAULT. Defaulting to `main` would mean a
   * misconfigured deployment publishes straight to the live website. Unset
   * means refuse.
   */
  CONTENT_BRANCH?: string;
}

/**
 * The complete set of error codes. Six, each mapping to a branch that exists.
 *
 * AUTH_INVALID covers every verification failure — bad signature, expired,
 * not-yet-valid, wrong issuer, wrong audience, unknown key, missing claim.
 * They are NOT distinguished to the caller. Separate codes would let someone
 * probe which check failed and tune a forgery against the answer. The real
 * reason is logged server-side, where debugging happens.
 */
export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'SERVER_ERROR';

const STATUS: Record<ErrorCode, number> = {
  AUTH_REQUIRED: 401,
  AUTH_INVALID: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  SERVER_ERROR: 500,
};

/**
 * Applied to EVERY response, success and failure alike. An error body is
 * still something a browser can be made to render.
 *
 * No Strict-Transport-Security: HSTS belongs to the hostname, not to the
 * subset of responses this Worker happens to generate, and the decision is
 * deferred (see docs/specs/2026-09-22-admin-cms-phase-2.md §E).
 *
 * No Access-Control-Allow-Origin, by design. The admin UI will be served from
 * this same origin, so cross-origin callers should be refused by the browser
 * — and the absence of these headers is what refuses them.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',

  // Per-identity responses. A cached {"email":…} on a shared device, or at any
  // intermediary, is an identity leak. no-store, not no-cache: do not write it
  // down at all.
  'Cache-Control': 'no-store',

  // Stops a browser re-reading a JSON error body as HTML or script.
  'X-Content-Type-Options': 'nosniff',

  // A JSON API legitimately needs to load nothing at all, so 'none' is not a
  // restriction here, it is an accurate description. Becomes load-bearing the
  // moment this origin also serves the admin UI.
  'Content-Security-Policy':
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; sandbox",

  // Admin URLs and any future query state must not travel to third parties.
  'Referrer-Policy': 'no-referrer',

  // Redundant with frame-ancestors on current browsers; costs one header for
  // anything older.
  'X-Frame-Options': 'DENY',

  // Near-zero value while the response is JSON — there is no browsing context
  // to restrict. Correct and already in place once the UI ships, and photo
  // upload uses a file picker, which needs no camera grant.
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
});

export interface OkBody<T> {
  ok: true;
  data: T;
}

export interface ErrorBody {
  ok: false;
  error: { code: ErrorCode };
}

function respond(body: OkBody<unknown> | ErrorBody, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...SECURITY_HEADERS } });
}

export function ok<T>(data: T): Response {
  return respond({ ok: true, data }, 200);
}

/**
 * The ONLY way this Worker reports a failure.
 *
 * It takes a code and nothing else — no message, no detail, no cause. A field
 * that exists is a field someone will eventually fill with something useful to
 * an attacker, so the shape makes that impossible rather than discouraged.
 */
export function fail(code: ErrorCode): Response {
  return respond({ ok: false, error: { code } }, STATUS[code]);
}
