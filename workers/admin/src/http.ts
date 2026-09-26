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
 * GITHUB_TOKEN is optional because an unconfigured deployment must refuse
 * repository operations. It is never exposed through this response layer.
 */
export interface Env {
  /** Static admin build. Worker-first routing authenticates every asset. */
  ASSETS?: { fetch(request: Request): Promise<Response> };
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
   * Fine-grained GitHub PAT: ONE repository, `Contents: Read and write` plus
   * `Actions: Read` for deployment status. No Workflows write or broader scope.
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
  /** 'on' when Workers Builds rebuilds this Worker after every content commit. */
  ADMIN_REBUILD?: string;
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
  | 'SERVER_ERROR'
  // ── Added when mutation routes arrived. Each maps to a branch that exists;
  //    none is speculative, and the auth codes above are unchanged.
  | 'BAD_REQUEST'
  | 'INVALID'
  | 'PAYLOAD_TOO_LARGE'
  | 'CONFLICT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'NOT_CONFIGURED';

const STATUS: Record<ErrorCode, number> = {
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

/**
 * CSP for the PANEL DOCUMENT, as opposed to the JSON API.
 *
 * The API's `default-src 'none'` is exactly right for a JSON response and
 * would block the panel's own stylesheet and script. Rather than loosening it
 * with 'unsafe-inline', the panel serves its CSS and JS as same-origin files,
 * so `'self'` is sufficient and no inline execution is ever permitted.
 *
 *  · script-src 'self'  — /panel.js only; an injected <script> cannot run
 *  · style-src  'self'  — /panel.css only; no inline style attribute either
 *  · img-src    blob:   — the file-picker preview, which is a local object URL
 *  · connect-src 'self' — fetch may reach this origin and nothing else
 *  · frame-ancestors / base-uri / form-action 'none' — unchanged
 */
export const PANEL_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; " +
  "connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export interface OkBody<T> {
  ok: true;
  data: T;
}

export interface ErrorBody {
  ok: false;
  error: { code: ErrorCode; issues?: readonly string[] };
}

/**
 * Stable machine keys naming what failed validation, e.g. `row_3_times_required`.
 *
 * ONLY ever attached to INVALID. This is not a hole in the "code and nothing
 * else" rule that protects the auth path: the caller is authenticated,
 * authorised, and being told about data it just submitted itself. It learns
 * nothing it did not already know.
 *
 * Keys, never sentences. The Hebrew the doctor reads lives in the UI, so the
 * Worker never carries display text and the two cannot disagree.
 */
export type Issues = readonly string[];

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
export function fail(code: ErrorCode, issues?: Issues): Response {
  // Issues are permitted only on INVALID. Guarding here rather than trusting
  // call sites means no future handler can attach detail to an auth refusal.
  const error = code === 'INVALID' && issues && issues.length > 0 ? { code, issues } : { code };
  return respond({ ok: false, error }, STATUS[code]);
}

/**
 * Read a JSON body, refusing anything oversized or not declared as JSON.
 *
 * Requiring `Content-Type: application/json` is a CSRF control as well as
 * hygiene: a cross-origin form post cannot set it without triggering a
 * preflight, which this Worker's absent CORS headers then fail.
 */
export async function readJson<T>(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; body: T } | { ok: false; code: ErrorCode }> {
  const type = request.headers.get('Content-Type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) {
    return { ok: false, code: 'BAD_REQUEST' };
  }

  // Trust the declared length only to reject early; the real cap is the bytes
  // actually read, because Content-Length can lie.
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, code: 'PAYLOAD_TOO_LARGE' };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, code: 'PAYLOAD_TOO_LARGE' };
  }

  try {
    return { ok: true, body: JSON.parse(text) as T };
  } catch {
    return { ok: false, code: 'BAD_REQUEST' };
  }
}

/**
 * State-changing requests must come from the admin origin.
 *
 * Checked server-side because CORS constrains browsers and a browser is not
 * the only thing that can issue a request. The Access assertion is still the
 * credential; this is defence in depth, not authentication.
 */
export function sameOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  // Absent Origin is refused on mutations rather than waved through: every
  // legitimate caller here is a browser fetch from the panel, which sets it.
  return origin !== null && origin === env.ADMIN_ORIGIN;
}
