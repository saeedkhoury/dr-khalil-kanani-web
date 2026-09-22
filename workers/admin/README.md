# Admin Worker

**It proves who you are and then does nothing.**

That is the entire current behaviour, on purpose. This Worker establishes the
security boundary for `admin.drkhalilkanani.com`; the endpoints that edit
opening hours and manage photographs go behind it in a later phase. If this
part is right, adding one of those is a routing change rather than a security
change.

## Status

**NOT DEPLOYED. NOT CONFIGURED.** No Cloudflare Access application exists, no
custom domain is bound, and no secret is set. `ALLOWED_EMAILS` is unset, which
means the Worker **refuses everyone** — including a perfectly valid, correctly
signed Access token. That is the intended resting state.

## What it does

| | |
|---|---|
| Routing | one route, one method, explicit. Everything else 404 or 405 |
| Authentication | independently verifies the Cloudflare Access JWT |
| Authorisation | checks the email claim against `ALLOWED_EMAILS` |
| Responses | one JSON shape, one header set, applied to errors too |

## What it deliberately does not do

No GitHub access and no credential for it · no data mutation · no upload · no
admin UI · no unauthenticated health endpoint · no CORS · no rate-limiting
code · **no development authentication bypass**.

## Why it verifies the JWT itself

Access sits in front of the hostname, so in the normal case no unauthenticated
request ever arrives. That is a perimeter, not a proof, and perimeters fail
open in the ways that matter: an Access application deleted, a policy widened
by accident, a route bound that does not pass through Access, a `workers.dev`
subdomain left enabled. In each of those a request arrives with no valid
assertion, and a Worker that trusted the perimeter would serve it.

Access is therefore the thing that *obtains* the credential. This Worker is the
thing that *checks* it.

## The cookie is never read

Access sets both a `Cf-Access-Jwt-Assertion` header and a `CF_Authorization`
cookie carrying the same token. Only the header is read, and that is the whole
CSRF story: a browser attaches cookies to cross-site requests automatically, so
a form on another origin could authenticate itself against a future mutation
endpoint. It cannot set a header — only Cloudflare's edge can. A test asserts a
cookie-only request is refused even when the token inside it is valid.

## Configuration

### Non-secret — `wrangler.toml` `[vars]`

| Name | Value |
|---|---|
| `ACCESS_TEAM_DOMAIN` | `<team>.cloudflareaccess.com`. **Issuer and JWKS URL are derived from it**, so there is one value to change and no way for them to disagree |
| `ACCESS_AUD` | the Access application's AUD tag. An identifier, not a credential — knowing it does not help forge a token |
| `ADMIN_ORIGIN` | `https://admin.drkhalilkanani.com` |

Both Access values are **empty placeholders**. They do not exist until the
Access application is created.

### Secret — out of band

```bash
wrangler secret put ALLOWED_EMAILS   # "someone@example.com,other@example.com"
```

Not a credential, but a list of personal addresses, and this repository is
public. A personal email in a public repo is scraped and spammed within days
with no way to undo it — the same reasoning that keeps `MAIL_TO` out of the
appointment relay's config.

Parsing is comma-separated, each entry trimmed and lowercased. **Unset, empty,
or separators-only all mean refuse everyone.** There is no "empty means allow
all" path, because unconfigured is exactly the state a deployment is in before
anyone has decided who should have access.

### Not here

`GITHUB_TOKEN` is absent from the `Env` type, from this config, and from the
account. This Worker cannot write to GitHub, and one that cannot name a
credential cannot leak one.

## Email matching

`trim()` then `toLowerCase()`. Nothing else.

No dot-folding and no `+tag` stripping: both are provider-specific rewrites
that change *who matches*. Folding `a.b@example.test` to `ab@example.test`
could admit an address that was never listed; stripping `+tag` could reject one
that was. Access returns the address as the identity provider verified it, and
the allow-list is a short list its owner controls.

## API

### `GET /api/session`

```json
{ "ok": true, "data": { "authenticated": true, "email": "someone@example.com" } }
```

Nothing else from the token is returned — no `sub`, `iss`, `aud`, `iat`,
`exp`, `nbf`, the raw assertion, or any other Access claim.

### Errors

```json
{ "ok": false, "error": { "code": "AUTH_REQUIRED" } }
```

| Code | Status | Meaning |
|---|---|---|
| `AUTH_REQUIRED` | 401 | no assertion header, or an empty one |
| `AUTH_INVALID` | 401 | a token was presented and did not verify |
| `FORBIDDEN` | 403 | verified identity, not on the allow-list |
| `NOT_FOUND` | 404 | unknown route |
| `METHOD_NOT_ALLOWED` | 405 | known route, wrong method |
| `SERVER_ERROR` | 500 | unexpected failure |

**Every verification failure returns `AUTH_INVALID`.** Expired, wrong audience,
wrong issuer, bad signature and unknown key are not distinguished, so a caller
cannot probe which check failed and tune a forgery against the answer. The
specific reason goes to the server log.

`FORBIDDEN` *is* distinguishable, deliberately: it tells someone who got
through Access that they are not on the list, which is useful and discloses
nothing.

## Security headers

On every response, errors included — an error body is still something a browser
can be made to render.

`Cache-Control: no-store` (responses are per-identity) · `X-Content-Type-Options:
nosniff` · `Content-Security-Policy: default-src 'none'; frame-ancestors 'none';
base-uri 'none'; form-action 'none'; sandbox` · `Referrer-Policy: no-referrer` ·
`X-Frame-Options: DENY` · `Permissions-Policy: camera=(), microphone=(),
geolocation=()`.

**No `Strict-Transport-Security`** — HSTS belongs to the hostname, not to the
subset of responses this Worker happens to generate, and the decision is
deferred.

**No CORS headers**, by design. The admin UI will be served from this same
origin, so their absence is what refuses a cross-origin caller.

## Tests

```bash
npm test
```

`tests/unit/admin-auth.test.ts` · `tests/unit/admin-worker.test.ts` ·
`tests/unit/admin-http.test.ts`, with fixtures in `tests/helpers/access-jwt.ts`.

Everything is offline. Real RSA keys are generated in memory, real RS256
tokens are signed, and global `fetch` is stubbed to serve a locally generated
JWKS — so the production verification path runs unchanged, including the
success case, with no network access. The stub refuses any other URL and
records the attempt; a test asserts nothing was recorded.

Fake identities only (`doctor@example.test`, `developer@example.test`). No real
address appears anywhere in this repository, and a separate test enforces that.

### There is no test-only bypass

The single seam is *which public keys* are consulted — a function parameter on
`authenticate()`, reachable only from code, that the entry point never passes.
Tests supply local keys; production resolves Cloudflare's. The same
verification runs in both, nothing is skipped or weakened, and no request can
influence the key source.

The suite is mutation-tested. Removing the RS256 pin, the issuer check, the
audience check, the fail-closed allow-list, the cookie exclusion, the clock
checks, the email normalisation, the authentication call itself, or adding a
CORS grant each fails at least one test.

## Local development

You cannot obtain a genuine Access assertion on `localhost`, and manufacturing
one would mean trusting a key this Worker should not trust. So it is not
exercised end to end locally, and **no development bypass exists to make that
possible** — a bypass is one misconfigured variable away from being production
behaviour.

Confidence comes from the offline suite, and from one manual check against a
deployment behind a real Access application, in the phase that creates it.

## Relationship to the appointment Worker

None. Separate Worker, separate directory, separate config, separate secrets,
separate domain. They have different blast radii — one can send email, this one
will eventually be able to publish to the website — and nothing is gained by
coupling them.

## Deployment

Not yet. The Access application must exist and be verified **before** a custom
domain makes this Worker reachable, and a non-allow-listed identity should be
refused while the Worker still holds nothing worth reaching. See
`docs/specs/2026-09-22-admin-cms-phase-2.md` §M.
