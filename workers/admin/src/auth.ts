/**
 * CLOUDFLARE ACCESS JWT VERIFICATION.
 *
 * ── WHY THE WORKER VERIFIES AT ALL ────────────────────────────────────────
 * Cloudflare Access sits in front of this hostname, so in the normal case no
 * unauthenticated request ever arrives. That is a perimeter, not a proof, and
 * perimeters fail open in exactly the ways that matter: an Access application
 * deleted, a policy widened by accident, a route bound that does not pass
 * through Access, a workers.dev subdomain left enabled. In each of those the
 * request arrives with no valid assertion — and a Worker that trusted the
 * perimeter would serve it.
 *
 * So Access is the thing that OBTAINS the credential, and this file is the
 * thing that CHECKS it. The Worker's security does not depend on Access being
 * configured correctly.
 *
 * ── NO BYPASS ─────────────────────────────────────────────────────────────
 * There is no environment flag, no development branch, and no code path in
 * which a missing or invalid assertion produces success. The only seam for
 * testing is WHICH PUBLIC KEYS are consulted (`keys` below), which an attacker
 * cannot influence: it is a function parameter, reachable only from code, and
 * the entry point never passes it.
 */

import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey, type JWTPayload } from 'jose';

import type { Env } from './http.ts';

/**
 * The header Cloudflare Access injects at the edge.
 *
 * Access ALSO sets a `CF_Authorization` cookie carrying the same token, and
 * this Worker never reads it. That is the CSRF defence and it is the whole of
 * it: a browser attaches cookies to cross-site requests automatically, so a
 * form on another origin could authenticate itself against a future mutation
 * endpoint. It cannot set a header — only Cloudflare's edge can — and a
 * cross-origin fetch that tries is stopped before it is sent.
 */
export const ACCESS_JWT_HEADER = 'Cf-Access-Jwt-Assertion';

/**
 * Tolerance for clock drift between Cloudflare's signer and this isolate.
 * Small on purpose: enough that a correctly issued token is not rejected a
 * second after it is minted, not enough to meaningfully extend an expired one.
 */
const CLOCK_TOLERANCE_SECONDS = 60;

/** The only signature algorithm Access uses, and the only one accepted. */
const ALGORITHMS = ['RS256'] as const;

/** What a caller learns about the authenticated person. Nothing more exists. */
export interface AccessIdentity {
  /** Normalised: trimmed and lowercased. */
  email: string;
}

export type AuthResult =
  | { ok: true; identity: AccessIdentity }
  /**
   * `code` is what the browser is told. `reason` is for the server log ONLY
   * and must never be returned — the whole point of collapsing every
   * verification failure into AUTH_INVALID is that the caller cannot tell
   * which check failed.
   */
  | { ok: false; code: 'AUTH_REQUIRED' | 'AUTH_INVALID' | 'FORBIDDEN'; reason: string };

/**
 * Trim and lowercase. Nothing else, deliberately.
 *
 * No dot-folding and no `+tag` stripping. Both are provider-specific rewrites
 * and both change WHO MATCHES: folding `a.b@example.test` to `ab@example.test`
 * could admit an address that was never listed, and stripping `+tag` could
 * reject one that was. Access returns the address as the identity provider
 * verified it, and the allow-list is a short list its owner controls, so exact
 * comparison after case-folding is both correct and predictable.
 */
export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Parse ALLOWED_EMAILS into a set, applying the SAME normalisation as the
 * incoming claim — one function, so the two sides cannot disagree.
 *
 * Unset, empty, or whitespace-only all yield an EMPTY SET, and an empty set
 * matches nobody. There is deliberately no "empty means allow all" path: the
 * unconfigured state must be the refusing state, because that is the state a
 * deployment is in before anyone has thought about who should have access.
 */
export function parseAllowedEmails(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map(normaliseEmail)
      .filter((email) => email !== ''),
  );
}

/** `https://<team>.cloudflareaccess.com` */
export function issuerFor(env: Env): string {
  return `https://${env.ACCESS_TEAM_DOMAIN}`;
}

/**
 * Derived from the issuer rather than configured separately. Two values could
 * drift, and a JWKS URL pointing at a different team than the issuer check is
 * a real vulnerability rather than a tidiness problem.
 */
export function jwksUrlFor(env: Env): URL {
  return new URL(`${issuerFor(env)}/cdn-cgi/access/certs`);
}

/**
 * One remote key set per issuer, reused across requests.
 *
 * jose owns the caching, key rotation, `kid` selection and — importantly —
 * the cooldown that stops a token bearing an unknown `kid` from triggering a
 * network fetch on every request. Writing that by hand is how a verifier
 * becomes a denial-of-service amplifier.
 */
const remoteKeySets = new Map<string, JWTVerifyGetKey>();

function remoteKeys(env: Env): JWTVerifyGetKey {
  const url = jwksUrlFor(env);
  const cached = remoteKeySets.get(url.href);
  if (cached) return cached;
  const keys = createRemoteJWKSet(url);
  remoteKeySets.set(url.href, keys);
  return keys;
}

/**
 * Verify the Access assertion and authorise the identity behind it.
 *
 * @param keys Public keys to verify against. Defaults to Cloudflare's live
 *   JWKS. Tests pass a locally generated set so the SAME verification code
 *   runs offline — nothing is skipped or weakened, only the key source
 *   differs, and that source is not reachable from a request.
 */
export async function authenticate(
  request: Request,
  env: Env,
  keys: JWTVerifyGetKey = remoteKeys(env),
): Promise<AuthResult> {
  // An absent header and a present-but-empty one are the same thing: no
  // credential was offered. Reporting the empty case as "invalid" would
  // suggest something was verified and found wanting, which is not what
  // happened.
  const token = request.headers.get(ACCESS_JWT_HEADER)?.trim();
  if (!token) {
    return { ok: false, code: 'AUTH_REQUIRED', reason: 'no assertion header' };
  }

  let payload: JWTPayload;
  try {
    // `algorithms` pins RS256 here, in OUR configuration. The token's own
    // `alg` header is never consulted to choose a verification strategy, so
    // `alg: none` and algorithm-confusion are not defended against — they are
    // impossible. jose resolves the key by `kid` from the key set and
    // validates iss, aud, exp and nbf as part of this single call; any
    // failure throws.
    ({ payload } = await jwtVerify(token, keys, {
      algorithms: [...ALGORITHMS],
      issuer: issuerFor(env),
      audience: env.ACCESS_AUD,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    }));
  } catch (error) {
    // Includes network and JWKS failures, which therefore fail CLOSED: if the
    // key set cannot be fetched, nobody is authenticated. The panel becoming
    // unavailable is acceptable; it becoming open is not.
    return {
      ok: false,
      code: 'AUTH_INVALID',
      reason: error instanceof Error ? error.message : 'verification failed',
    };
  }

  // A service token carries `common_name` and no `email`. This Worker
  // authorises people, not machines, so a token without a usable email claim
  // is refused rather than being allowed to fall through to the allow-list
  // check with an empty identity.
  const claim = payload.email;
  if (typeof claim !== 'string' || claim.trim() === '') {
    return { ok: false, code: 'AUTH_INVALID', reason: 'no email claim' };
  }

  const email = normaliseEmail(claim);
  const allowed = parseAllowedEmails(env.ALLOWED_EMAILS);
  if (!allowed.has(email)) {
    // Reached only when the Access policy is broader than this allow-list, or
    // when the allow-list is unconfigured. Both are states worth refusing in.
    return { ok: false, code: 'FORBIDDEN', reason: 'identity not allow-listed' };
  }

  return { ok: true, identity: { email } };
}
