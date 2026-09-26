/**
 * OFFLINE Cloudflare Access JWT fixtures.
 *
 * Generates a real RSA keypair, signs real RS256 tokens and publishes a real
 * JWKS — all in memory. Tests therefore exercise the PRODUCTION verification
 * path against genuine cryptography, with no network, no wrangler and no
 * miniflare. Nothing is stubbed out; only the key source differs, and the
 * verifier accepts it through a parameter that no request can influence.
 *
 * Not named `*.test.ts`, so the runner does not try to execute it as a suite.
 */

import { SignJWT, exportJWK, importJWK, createLocalJWKSet, type JWTVerifyGetKey, type JWK } from 'jose';

export const TEAM_DOMAIN = 'kanani-test.cloudflareaccess.test';
export const ISSUER = `https://${TEAM_DOMAIN}`;
export const AUDIENCE = 'test-aud-tag-0000000000000000000000000000000000000000';

/** Fake identities. Real addresses appear nowhere in this repository. */
export const DOCTOR = 'doctor@example.test';
export const DEVELOPER = 'developer@example.test';
export const STRANGER = 'stranger@example.test';

const KID = 'access-test-key-1';
const OTHER_KID = 'access-other-key-1';

async function generate(): Promise<CryptoKeyPair> {
  return (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
}

/** The key Access is pretending to sign with. */
const signing = await generate();
/** A second, UNTRUSTED key — for "correct claims, wrong signer". */
const foreign = await generate();

async function publicJwk(pair: CryptoKeyPair, kid: string): Promise<JWK> {
  return { ...(await exportJWK(pair.publicKey)), kid, alg: 'RS256', use: 'sig' };
}

/**
 * The JWKS the verifier trusts. Contains ONLY the legitimate key, so a token
 * signed by `foreign` fails for the same reason a forgery would in production.
 */
export const trustedKeys: JWTVerifyGetKey = createLocalJWKSet({
  keys: [await publicJwk(signing, KID)],
});

/**
 * The same public key, published WITHOUT an `alg` field.
 *
 * A JWKS entry that declares `alg: RS256` lets jose reject a different
 * algorithm on key metadata alone — which would mean an algorithm-confusion
 * test passes because of what the key server said, not because of what we
 * configured. Verifying against this set removes that help, so a refusal can
 * only come from our own `algorithms: ['RS256']` pin.
 */
export const trustedKeysWithoutAlg: JWTVerifyGetKey = createLocalJWKSet({
  keys: [{ ...(await exportJWK(signing.publicKey)), kid: KID, use: 'sig' }],
});

/**
 * A PS256 (RSA-PSS) token signed with the SAME key material as a legitimate
 * RS256 one — the algorithm-swap attack. Refused only because RS256 is pinned
 * in our verification configuration.
 */
export async function makePs256Token(email = DOCTOR): Promise<string> {
  const jwk = { ...(await exportJWK(signing.privateKey)), kid: KID, alg: 'PS256' };
  const key = await importJWK(jwk, 'PS256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'PS256', kid: KID })
    .setIssuedAt(now)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(now + 300)
    .sign(key);
}

/**
 * The JWKS document a key server would serve, for stubbing `fetch` so tests
 * can exercise the Worker end to end with NO network access at all.
 */
export const jwksDocument = { keys: [await publicJwk(signing, KID)] };

/**
 * Replace global fetch for the duration of `run`, serving the JWKS above to
 * any request for a `/cdn-cgi/access/certs` URL and refusing everything else.
 *
 * Nothing leaves the machine: an unstubbed request would be a test depending
 * on the network, and `notFetched` records any attempt to reach elsewhere.
 */
export async function withStubbedJwks<T>(
  run: () => Promise<T>,
  { fail = false }: { fail?: boolean } = {},
): Promise<{ result: T; notFetched: string[] }> {
  const original = globalThis.fetch;
  const notFetched: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.includes('/cdn-cgi/access/certs')) {
      notFetched.push(url);
      throw new Error(`unexpected network access to ${url}`);
    }
    if (fail) throw new Error('key server unreachable');
    return new Response(JSON.stringify(jwksDocument), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    return { result: await run(), notFetched };
  } finally {
    globalThis.fetch = original;
  }
}

export interface TokenOptions {
  email?: string | null;
  issuer?: string;
  audience?: string | string[];
  /** Seconds from now. Negative = already expired. */
  expiresInSeconds?: number;
  /** Seconds from now. Positive = not yet valid. */
  notBeforeSeconds?: number;
  kid?: string;
  /** Sign with the untrusted key instead of the legitimate one. */
  signWithForeignKey?: boolean;
  /** Extra claims, e.g. a service token's `common_name`. */
  extra?: Record<string, unknown>;
}

/** A correctly signed, currently valid Access-shaped token. */
export async function makeToken(options: TokenOptions = {}): Promise<string> {
  const {
    email = DOCTOR,
    issuer = ISSUER,
    audience = AUDIENCE,
    expiresInSeconds = 300,
    notBeforeSeconds,
    kid = options.signWithForeignKey ? OTHER_KID : KID,
    signWithForeignKey = false,
    extra = {},
  } = options;

  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = { ...extra };
  if (email !== null) claims.email = email;

  let jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuedAt(now)
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(now + expiresInSeconds);

  if (notBeforeSeconds !== undefined) jwt = jwt.setNotBefore(now + notBeforeSeconds);

  return jwt.sign(signWithForeignKey ? foreign.privateKey : signing.privateKey);
}

const b64u = (value: string) => Buffer.from(value, 'utf8').toString('base64url');

/**
 * An unsigned `alg: none` token — the classic algorithm-confusion attack,
 * hand-built because no signing library will produce one.
 */
export function makeAlgNoneToken(email = DOCTOR): string {
  const header = b64u(JSON.stringify({ alg: 'none', typ: 'JWT', kid: KID }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64u(
    JSON.stringify({ email, iss: ISSUER, aud: AUDIENCE, exp: now + 300, iat: now }),
  );
  return `${header}.${payload}.`;
}

/** A valid token whose payload was edited after signing. */
export async function makeTamperedToken(email = STRANGER): Promise<string> {
  const [header, , signature] = (await makeToken()).split('.');
  const now = Math.floor(Date.now() / 1000);
  const forged = b64u(
    JSON.stringify({ email, iss: ISSUER, aud: AUDIENCE, exp: now + 300, iat: now }),
  );
  return `${header}.${forged}.${signature}`;
}

/** A request carrying the assertion in the header Access uses. */
export function requestWithToken(
  token: string,
  { method = 'GET', path = '/api/session' } = {},
): Request {
  return new Request(`https://admin.drkhalilkanani.test${path}`, {
    method,
    headers: { 'Cf-Access-Jwt-Assertion': token },
  });
}

/** A request carrying the token ONLY as the cookie Access also sets. */
export function requestWithCookieOnly(
  token: string,
  { method = 'GET', path = '/api/session' } = {},
): Request {
  return new Request(`https://admin.drkhalilkanani.test${path}`, {
    method,
    headers: { Cookie: `CF_Authorization=${token}` },
  });
}

/** A request with no credential at all. */
export function requestWithout({ method = 'GET', path = '/api/session' } = {}): Request {
  return new Request(`https://admin.drkhalilkanani.test${path}`, { method });
}
