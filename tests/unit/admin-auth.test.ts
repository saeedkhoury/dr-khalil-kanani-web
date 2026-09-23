/**
 * Cloudflare Access JWT verification and the identity allow-list.
 *
 * This is the security boundary of the admin panel, so almost everything here
 * asserts a REFUSAL. The happy path is one test; the other thirty describe
 * what must never be let through.
 *
 * Every token is really signed and really verified — see tests/helpers/
 * access-jwt.ts. The production verification code is what runs; only the
 * public keys are local, and that source is a function parameter no request
 * can reach.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { authenticate, normaliseEmail, parseAllowedEmails } from '../../workers/admin/src/auth.ts';
import type { Env } from '../../workers/admin/src/http.ts';
import {
  AUDIENCE, DOCTOR, DEVELOPER, ISSUER, STRANGER, TEAM_DOMAIN,
  makeAlgNoneToken, makePs256Token, makeTamperedToken, makeToken,
  requestWithCookieOnly, requestWithToken, requestWithout,
  trustedKeys, trustedKeysWithoutAlg,
} from '../helpers/access-jwt.ts';

const env = (allowed?: string): Env => ({
  ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
  ACCESS_AUD: AUDIENCE,
  ADMIN_ORIGIN: 'https://admin.drkhalilkanani.test',
  ...(allowed === undefined ? {} : { ALLOWED_EMAILS: allowed }),
});

const CONFIGURED = env(`${DOCTOR}, ${DEVELOPER}`);

/** Authenticate against the local key set. */
const auth = (request: Request, e: Env = CONFIGURED) => authenticate(request, e, trustedKeys);

/** Assert a refusal and return it for further inspection. */
async function refused(request: Request, e: Env = CONFIGURED) {
  const result = await auth(request, e);
  assert.equal(result.ok, false, 'expected the request to be refused');
  return result as Extract<Awaited<ReturnType<typeof auth>>, { ok: false }>;
}

describe('Access JWT verification', () => {
  test('1. a valid, allow-listed identity is accepted', async () => {
    const result = await auth(requestWithToken(await makeToken({ email: DOCTOR })));
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.identity, { email: DOCTOR });
  });

  test('2. a missing assertion header is refused', async () => {
    assert.equal((await refused(requestWithout())).code, 'AUTH_REQUIRED');
  });

  test('3. a malformed token is refused', async () => {
    for (const bad of ['not.a.jwt', 'garbage', 'a.b', 'a.b.c.d', 'Bearer x.y.z']) {
      assert.equal((await refused(requestWithToken(bad))).code, 'AUTH_INVALID', `accepted ${bad}`);
    }
  });

  test('3b. an empty or whitespace-only header counts as no credential', async () => {
    // Not AUTH_INVALID: nothing was verified and found wanting, nothing was
    // offered. Same answer as omitting the header entirely.
    for (const empty of ['', '   ', '\t']) {
      assert.equal((await refused(requestWithToken(empty))).code, 'AUTH_REQUIRED', `${JSON.stringify(empty)}`);
    }
  });

  test('4. correct claims signed by the wrong key are refused', async () => {
    // The forgery case: everything looks right except the signature.
    const token = await makeToken({ email: DOCTOR, signWithForeignKey: true });
    assert.equal((await refused(requestWithToken(token))).code, 'AUTH_INVALID');
  });

  test('5. a payload edited after signing is refused', async () => {
    // Privilege escalation by claim rewriting.
    assert.equal((await refused(requestWithToken(await makeTamperedToken(DOCTOR)))).code, 'AUTH_INVALID');
  });

  test('6. an expired token is refused', async () => {
    // Well past the 60s clock tolerance.
    const token = await makeToken({ expiresInSeconds: -3600 });
    assert.equal((await refused(requestWithToken(token))).code, 'AUTH_INVALID');
  });

  test('7. a not-yet-valid token is refused', async () => {
    const token = await makeToken({ notBeforeSeconds: 3600 });
    assert.equal((await refused(requestWithToken(token))).code, 'AUTH_INVALID');
  });

  test('8. a token from another issuer is refused', async () => {
    // An attacker's own Access team signing a token for their own tenant.
    const token = await makeToken({ issuer: 'https://attacker.cloudflareaccess.test' });
    assert.equal((await refused(requestWithToken(token))).code, 'AUTH_INVALID');
  });

  test('9. a token for another audience is refused', async () => {
    // A valid token for a DIFFERENT Access application in the same account.
    const token = await makeToken({ audience: 'some-other-application-aud-tag' });
    assert.equal((await refused(requestWithToken(token))).code, 'AUTH_INVALID');
  });

  test('10. an audience array is handled — matching accepted, non-matching refused', async () => {
    const matching = await makeToken({ audience: ['other-app', AUDIENCE] });
    assert.equal((await auth(requestWithToken(matching))).ok, true);

    const notMatching = await makeToken({ audience: ['other-app', 'third-app'] });
    assert.equal((await refused(requestWithToken(notMatching))).code, 'AUTH_INVALID');
  });

  test('11. an unknown kid is refused', async () => {
    const token = await makeToken({ kid: 'a-key-that-was-never-published' });
    assert.equal((await refused(requestWithToken(token))).code, 'AUTH_INVALID');
  });

  test('12. alg:none is refused', async () => {
    // Not defended against — impossible. RS256 is pinned in our verification
    // configuration and the token's own alg header never selects a strategy.
    assert.equal((await refused(requestWithToken(makeAlgNoneToken(DOCTOR)))).code, 'AUTH_INVALID');
  });

  test('12b. an algorithm swap to PS256 with the same key is refused', async () => {
    // The attack the RS256 pin actually prevents. alg:none is refused by the
    // library regardless, so it does not prove the pin does anything — this
    // does: the same RSA key material, re-imported and used for RSA-PSS.
    //
    // Verified against a JWKS that does NOT advertise `alg`, so the refusal
    // cannot come from key metadata. Only our own configuration can produce
    // it, and removing `algorithms: ['RS256']` makes this test fail.
    const token = await makePs256Token(DOCTOR);
    const result = await authenticate(requestWithToken(token), CONFIGURED, trustedKeysWithoutAlg);
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, 'AUTH_INVALID');

    // Control: an RS256 token verifies fine against the same key set, so the
    // refusal above is about the algorithm and not about the key set.
    const good = await authenticate(
      requestWithToken(await makeToken({ email: DOCTOR })), CONFIGURED, trustedKeysWithoutAlg,
    );
    assert.equal(good.ok, true);
  });

  test('13. a token with no email claim is refused', async () => {
    assert.equal((await refused(requestWithToken(await makeToken({ email: null })))).code, 'AUTH_INVALID');
  });

  test('14. an empty or blank email claim is refused', async () => {
    for (const blank of ['', '   ']) {
      assert.equal((await refused(requestWithToken(await makeToken({ email: blank })))).code, 'AUTH_INVALID');
    }
  });

  test('15. a service-token shape (common_name, no email) is refused', async () => {
    // This Worker authorises people, not machines.
    const token = await makeToken({ email: null, extra: { common_name: 'ci-automation.access' } });
    assert.equal((await refused(requestWithToken(token))).code, 'AUTH_INVALID');
  });

  test('16. a valid identity that is not allow-listed is refused', async () => {
    // Reached when the Access policy is broader than the allow-list.
    assert.equal((await refused(requestWithToken(await makeToken({ email: STRANGER })))).code, 'FORBIDDEN');
  });
});

describe('allow-list fails closed', () => {
  test('17. ALLOWED_EMAILS unset refuses a perfectly valid token', async () => {
    // The state this repository ships in, and must keep refusing in.
    const result = await refused(requestWithToken(await makeToken({ email: DOCTOR })), env(undefined));
    assert.equal(result.code, 'FORBIDDEN');
  });

  test('18. ALLOWED_EMAILS empty refuses everyone', async () => {
    assert.equal((await refused(requestWithToken(await makeToken()), env(''))).code, 'FORBIDDEN');
  });

  test('19. ALLOWED_EMAILS whitespace or separators only refuses everyone', async () => {
    for (const blank of ['   ', ',', ' , , ', '\t\n']) {
      const result = await refused(requestWithToken(await makeToken()), env(blank));
      assert.equal(result.code, 'FORBIDDEN', `accepted with ALLOWED_EMAILS=${JSON.stringify(blank)}`);
    }
  });

  test('20. there is no "empty means allow all" path', () => {
    for (const raw of [undefined, '', '   ', ',,,']) {
      assert.equal(parseAllowedEmails(raw).size, 0, `${JSON.stringify(raw)} produced entries`);
    }
  });
});

describe('email normalisation', () => {
  test('21. surrounding whitespace is trimmed on both sides of the comparison', async () => {
    const token = await makeToken({ email: `  ${DOCTOR}  ` });
    const result = await auth(requestWithToken(token), env(`  ${DOCTOR}  , ${DEVELOPER}`));
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.identity.email, DOCTOR);
  });

  test('22. comparison is case-insensitive', async () => {
    const token = await makeToken({ email: 'Doctor@Example.TEST' });
    const result = await auth(requestWithToken(token), env('DOCTOR@example.test'));
    assert.equal(result.ok, true);
    // Stored and returned normalised, never as presented.
    assert.equal(result.ok && result.identity.email, 'doctor@example.test');
  });

  test('23. dots are NOT folded', async () => {
    // Folding would admit an address the owner never listed.
    const token = await makeToken({ email: 'a.b@example.test' });
    assert.equal((await refused(requestWithToken(token), env('ab@example.test'))).code, 'FORBIDDEN');
  });

  test('24. +tags are NOT stripped', async () => {
    // Stripping would reject an address the owner did list, and admit ones he
    // did not; either way the allow-list would stop meaning what it says.
    const token = await makeToken({ email: 'a+tag@example.test' });
    assert.equal((await refused(requestWithToken(token), env('a@example.test'))).code, 'FORBIDDEN');

    const exact = await makeToken({ email: 'a+tag@example.test' });
    assert.equal((await auth(requestWithToken(exact), env('a+tag@example.test'))).ok, true);
  });

  test('25. normaliseEmail does exactly two things', () => {
    assert.equal(normaliseEmail('  Foo@Bar.TEST '), 'foo@bar.test');
    assert.equal(normaliseEmail('a.b+c@d.test'), 'a.b+c@d.test');
  });
});

describe('the cookie is never a credential', () => {
  test('26. a valid token presented only as CF_Authorization is refused', async () => {
    // THE CSRF test. Access sets this cookie with the same token, and a
    // browser attaches cookies to cross-site requests automatically. If the
    // cookie were accepted, a form on another origin could authenticate
    // itself against a future mutation endpoint. A header cannot be set that
    // way, so reading only the header IS the CSRF defence.
    const token = await makeToken({ email: DOCTOR });
    const result = await refused(requestWithCookieOnly(token));
    assert.equal(result.code, 'AUTH_REQUIRED', 'the cookie must not even be seen as an attempt');
  });

  test('27. the header wins and the cookie is ignored entirely', async () => {
    // A stranger's cookie alongside a legitimate header must not change the
    // outcome in either direction.
    const request = new Request('https://admin.drkhalilkanani.test/api/session', {
      headers: {
        'Cf-Access-Jwt-Assertion': await makeToken({ email: DOCTOR }),
        Cookie: `CF_Authorization=${await makeToken({ email: STRANGER })}`,
      },
    });
    const result = await auth(request);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.identity.email, DOCTOR);
  });
});

describe('failures are externally indistinguishable', () => {
  test('28. every verification failure yields the same code', async () => {
    // If these differed, a caller could probe which check failed and tune a
    // forgery against the answer.
    const tokens = [
      'not.a.jwt',
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
    const codes = new Set<string>();
    for (const token of tokens) codes.add((await refused(requestWithToken(token))).code);
    assert.deepEqual([...codes], ['AUTH_INVALID'], 'verification failures must be indistinguishable');
  });

  test('29. the diagnostic reason stays server-side and is never the code', async () => {
    // `reason` exists for console logging. It must never be what the browser
    // is told, and index.ts is what enforces that by only passing `code`.
    const result = await refused(requestWithToken(await makeToken({ expiresInSeconds: -3600 })));
    assert.equal(result.code, 'AUTH_INVALID');
    assert.ok(result.reason.length > 0, 'a reason should be recorded for the log');
    assert.notEqual(result.reason, result.code);
  });
});

describe('configuration derivation', () => {
  test('30. the JWKS URL is derived from the issuer, so they cannot disagree', async () => {
    const { accessConfig } = await import('../../workers/admin/src/auth.ts');
    const config = accessConfig(env(''));
    assert.ok(config);
    assert.equal(config.issuer, `https://${TEAM_DOMAIN}`);
    assert.equal(config.jwksUrl.href, `https://${TEAM_DOMAIN}/cdn-cgi/access/certs`);
    assert.ok(config.jwksUrl.href.startsWith(config.issuer), 'JWKS must live under the issuer');
    assert.equal(ISSUER, config.issuer);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   H-3: unusable Access configuration must fail CLOSED.

   Two ways this used to fail open:
     · jwtVerify treats an UNDEFINED audience as "do not check the audience",
       so a token for any other Access application in the same Cloudflare
       account would have been accepted.
     · An EMPTY team domain is not an error — `https:///cdn-cgi/...` silently
       normalises to `https://cdn-cgi/...`, a different host, so the Worker
       would have asked an unintended server for its verification keys.
   ──────────────────────────────────────────────────────────────────────── */

describe('unusable Access configuration fails closed', () => {
  const unusable = [undefined, '', '   ', '\t\n'];

  test('31. an unusable ACCESS_AUD refuses a perfectly valid token', async () => {
    for (const value of unusable) {
      const e = { ...CONFIGURED, ACCESS_AUD: value } as unknown as Env;
      const result = await auth(requestWithToken(await makeToken({ email: DOCTOR })), e);
      assert.equal(result.ok, false, `accepted with ACCESS_AUD=${JSON.stringify(value)}`);
      assert.equal(result.ok === false && result.code, 'AUTH_INVALID');
    }
  });

  test('32. an unusable ACCESS_TEAM_DOMAIN refuses a perfectly valid token', async () => {
    for (const value of unusable) {
      const e = { ...CONFIGURED, ACCESS_TEAM_DOMAIN: value } as unknown as Env;
      const result = await auth(requestWithToken(await makeToken({ email: DOCTOR })), e);
      assert.equal(result.ok, false, `accepted with ACCESS_TEAM_DOMAIN=${JSON.stringify(value)}`);
      assert.equal(result.ok === false && result.code, 'AUTH_INVALID');
    }
  });

  test('33. a token for ANOTHER Access application is refused when aud is unbound', async () => {
    // The specific escalation: same team, same issuer, different application.
    const e = { ...CONFIGURED, ACCESS_AUD: undefined } as unknown as Env;
    const foreign = await makeToken({ email: DOCTOR, audience: 'aud-of-another-access-app' });
    const result = await auth(requestWithToken(foreign), e);
    assert.equal(result.ok, false);
  });

  test('34. a team domain that is not a bare hostname is refused', async () => {
    // It becomes a URL, so anything carrying a path, port, scheme, credentials
    // or whitespace is refused rather than normalised into another host.
    for (const bad of [
      'team.cloudflareaccess.test/evil', 'team.cloudflareaccess.test:8443',
      'https://team.cloudflareaccess.test', 'user@evil.test', 'team',
      'team..test', '-team.test', 'team.test-', 'cdn-cgi', '../team.test',
      'team.test/../..', 'team .test',
    ]) {
      const e = { ...CONFIGURED, ACCESS_TEAM_DOMAIN: bad } as unknown as Env;
      const result = await auth(requestWithToken(await makeToken({ email: DOCTOR })), e);
      assert.equal(result.ok, false, `accepted team domain ${JSON.stringify(bad)}`);
    }
  });

  test('35. accessConfig returns null rather than a half-built configuration', async () => {
    const { accessConfig } = await import('../../workers/admin/src/auth.ts');
    for (const value of unusable) {
      assert.equal(accessConfig({ ...CONFIGURED, ACCESS_AUD: value } as unknown as Env), null);
      assert.equal(accessConfig({ ...CONFIGURED, ACCESS_TEAM_DOMAIN: value } as unknown as Env), null);
    }
    assert.ok(accessConfig(CONFIGURED), 'a usable configuration must still work');
  });

  test('35b. whitespace-padded configuration is trimmed, not rejected', async () => {
    // The guard only proves the values are non-empty. The TRIMMED values must
    // be what reaches jose, or a deployment whose secret carries a trailing
    // newline would refuse every valid token and look like an auth outage.
    const padded = {
      ...CONFIGURED,
      ACCESS_AUD: `  ${AUDIENCE}\n`,
      ACCESS_TEAM_DOMAIN: ` ${TEAM_DOMAIN} `,
    } as unknown as Env;
    const result = await auth(requestWithToken(await makeToken({ email: DOCTOR })), padded);
    assert.equal(result.ok, true, 'padded configuration must still authenticate');
  });

  test('36. misconfiguration is indistinguishable from a bad credential', async () => {
    // An unauthenticated caller must not learn that the deployment is
    // misconfigured, so this reuses the ordinary verification-failure answer.
    const misconfigured = await auth(
      requestWithToken(await makeToken({ email: DOCTOR })),
      { ...CONFIGURED, ACCESS_AUD: '' } as unknown as Env,
    );
    const badToken = await auth(requestWithToken('not.a.jwt'));
    assert.equal(
      misconfigured.ok === false && misconfigured.code,
      badToken.ok === false && badToken.code,
    );
  });
});
