# Admin CMS — Phase 2 proposal: Worker security / auth foundation

**Status:** proposal, awaiting approval. Nothing implemented.
**Scope:** the authentication shell for `admin.drkhalilkanani.com`. No data
mutation, no GitHub writes, no UI, no Cloudflare configuration.

> Phase 1 (accepted) is the baseline. Phase 2 must not alter public-site
> generated output.

---

## A. Objective

A Worker that **proves who you are and then does nothing**.

Its entire job is to establish a boundary that later phases can put endpoints
behind. If Phase 2 is correct, adding a mutation endpoint in Phase 4 is a
routing change rather than a security change.

### In scope

| | |
|---|---|
| Request routing | one router, explicit method allow-list per route |
| Access JWT verification | independent, cryptographic, against Cloudflare's JWKS |
| Identity allow-list | `ALLOWED_EMAILS`, fail-closed |
| Response/error model | stable machine-readable codes, no internals |
| Method / content-type restrictions | explicit, default-deny |
| Security headers | on every response including errors |
| Environment typing | `Env` interface, no secret it does not need |
| Test infrastructure | offline JWT/JWKS fixtures |

### Explicitly out of scope

Opening-hours mutation · photo upload · GitHub writes · publication polling ·
admin UI · Cloudflare production configuration · `GITHUB_TOKEN` (not even in
the `Env` type — see §G).

### Deliberately NOT built

**No unauthenticated health endpoint.** Access sits in front of the whole
hostname, so an unauthenticated probe cannot reach the Worker anyway; the
endpoint would be unreachable in production and therefore useless, while
being one more route to get wrong. `GET /api/session` is the liveness check,
and it is meaningful precisely because it is authenticated.

**No rate-limit no-op hook.** Writing a function that does nothing is dead
code pretending to be a control. §F names the insertion point instead.

**No request-size limit yet.** No Phase 2 route accepts a body, so a limit
would be untestable and speculative. It lands with the first body-accepting
route.

---

## B. Authentication flow

```
Browser
  │  (1) GET https://admin.drkhalilkanani.com/api/session
  ▼
Cloudflare Access  ── not signed in? ──▶ email OTP challenge, then redirect back
  │  (2) signs a JWT, injects header  Cf-Access-Jwt-Assertion: <jwt>
  │      and sets cookie              CF_Authorization=<jwt>
  ▼
Worker
  │  (3) read the HEADER, never the cookie          ─┐
  │  (4) fetch + cache Cloudflare's JWKS             │  independent
  │  (5) verify RS256 signature against the kid      │  verification
  │  (6) validate iss, aud, exp, nbf (clock skew)    │
  │  (7) extract the `email` claim                  ─┘
  │  (8) normalise, compare against ALLOWED_EMAILS
  ▼
accept (200) │ reject (401 / 403)
```

### Why the Worker verifies at all

Access in front is a perimeter, not a proof. It fails open in exactly the ways
that matter: an Access application accidentally deleted, a policy widened, a
route bound to the Worker that bypasses the Access hostname, or a future
`workers.dev` subdomain left enabled. In each case requests arrive with no
valid assertion — and a Worker that trusted the perimeter would serve them.

Verifying the signature makes the Worker's security independent of Access
being configured correctly. Access becomes the thing that *obtains* the
credential; the Worker is the thing that *checks* it.

### Step detail

| Step | Rule | Failure |
|---|---|---|
| JWT source | `Cf-Access-Jwt-Assertion` request header **only** | absent → `AUTH_REQUIRED` 401 |
| Cookie | `CF_Authorization` is **never** read | — |
| Issuer | must equal `https://${ACCESS_TEAM_DOMAIN}` | `AUTH_INVALID` 401 |
| JWKS | `https://${ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, cached, keyed by `kid` | `AUTH_INVALID` 401 |
| Algorithm | `RS256` only, taken from the JWKS key — never from the token header | `AUTH_INVALID` 401 |
| Audience | must contain `ACCESS_AUD` exactly | `AUTH_INVALID` 401 |
| Expiry | `exp` in the future, `nbf`/`iat` not in the future, 60s tolerance | `AUTH_INVALID` 401 |
| Identity claim | `email`, a non-empty string | `AUTH_INVALID` 401 |
| Service tokens | a token with `common_name` and no `email` is refused | `AUTH_INVALID` 401 |
| Allow-list | normalised email ∈ `ALLOWED_EMAILS` | `FORBIDDEN` 403 |

**`alg` is never read from the token.** The verifying key and its algorithm
come from the JWKS entry matched by `kid`, with `RS256` pinned explicitly.
This is what makes `alg: none` and algorithm-confusion attacks structurally
impossible rather than defended against.

### Email normalisation

Trim surrounding whitespace, then lowercase. **Nothing else.**

No dot-folding, no `+tag` stripping. Both are provider-specific rewrites and
both change *who matches*: folding `a.b@example.test` to `ab@example.test` could
admit an address the owner never listed, and stripping `+tag` could reject one
he did. Access returns the address as the identity provider verified it, and
the allow-list is a short list the owner controls — exact comparison after
case-folding is correct and predictable.

Comparison is against a `Set` built once per request from `ALLOWED_EMAILS`,
each entry trimmed and lowercased the same way, so the rule cannot differ
between the two sides.

### `ALLOWED_EMAILS` parsing and fail-closed behaviour

Comma-separated. Split, trim, lowercase, drop empties.

**An unset, empty or whitespace-only value yields an empty set, and an empty
set refuses everyone** — including a perfectly valid, correctly signed,
unexpired Access token. There is no "empty means allow all" path and no
default identity. This is the state the repository is in today and must remain
in until the owner supplies the list.

The doctor's address and the owner's address are **not** written anywhere in
this proposal, in code, or in configuration. They are supplied out of band.

---

## C. Dependency decision

Current state: no JWT library, no `wrangler`, no `zod`. The appointment Worker
uses only the runtime's own APIs. Adding a dependency is therefore a real
decision, not a default.

| Option | Verdict |
|---|---|
| **A. `jose`** | **Recommended** |
| B. Cloudflare-native | Does not exist as an API |
| C. Hand-rolled | Refused |

### Why not B

There is no Workers runtime API that verifies an Access JWT. "Native" means
`crypto.subtle` plus your own JWKS fetching, caching, `kid` selection, base64url
handling and claim validation — which is option C wearing a different label.
Cloudflare's own documented approach for this is a JWT library.

### Why not C

Direct instruction, and it is the right one. The parts most likely to be got
subtly wrong are not the RSA verification itself — `crypto.subtle.verify` is
one call — but everything around it: accepting `alg` from the token, comparing
`aud` when it is a string vs an array, forgetting `nbf`, mishandling base64url
padding, caching JWKS without honouring key rotation, or fetching JWKS on every
request and creating a DoS amplifier. A library that has had those bugs found
already is worth more than the bytes it costs.

### Why `jose`

| | |
|---|---|
| Version | 6.2.12 |
| Runtime dependencies | **zero** (verified via `npm view jose dependencies`) |
| Unpacked | 211 KB — the whole package, every algorithm, ESM + types |
| Bundle impact | far smaller in practice: only `jwtVerify` and `createRemoteJWKSet` are imported, and Wrangler tree-shakes ESM. Against the Worker size budget this is not close to a constraint |
| Workers runtime | built on Web Crypto and `fetch`, the two things Workers has. No Node built-ins, no polyfill, no `nodejs_compat` flag |
| Maintenance | the reference implementation in this space; `jwks-rsa` depends on it rather than competing with it |

`createRemoteJWKSet` is the specific reason. It handles JWKS caching, `kid`
lookup, key rotation and a cooldown that prevents a token with an unknown `kid`
from triggering a fetch per request. That is the part worth not writing.

### Considered and rejected

- **`@tsndr/cloudflare-worker-jwt`** (18 KB) — genuinely smaller and
  Workers-targeted, but leaves JWKS retrieval, caching and rotation to us,
  which is the half most likely to be wrong, and has a much narrower review
  surface for security-critical code.
- **`jsonwebtoken`** (43 KB, 6 transitive deps) — Node-crypto based. Wrong
  runtime.
- **`jwks-rsa`** — depends on `jose` plus `debug`, `limiter`, `lru-cache`,
  `lru-memoizer`. Strictly more dependencies for the same capability.

### Placement

Root `package.json` `dependencies`. It does not reach the site bundle: Astro
bundles only what site modules import, and no site module imports it. The
Phase 2 output comparison (§N) is what proves that rather than assumes it.

**Nothing is installed until this is approved.**

---

## D. Route surface

Two routes. Both `GET`. Everything else refused.

### `GET /api/session`

The only authenticated endpoint.

```json
{ "ok": true, "data": { "authenticated": true, "email": "<authenticated email>" } }
```

**On including `email`:** the caller has just presented a signed assertion
naming that address, so returning it discloses nothing the caller did not
supply. It is the identity claim itself, not an extra claim. It makes the
endpoint a genuine end-to-end check — a constant `{authenticated:true}` proves
only that the router ran — and the future UI needs it to show which identity
is acting before a publish. Trivially removable if you would rather it were
not there.

Returned: nothing else. Not `sub`, `iat`, `exp`, `aud`, `iss`, the raw token,
country, device posture, or any other Access claim.

### `GET /api/health`

**Not built.** See §A.

### Behaviour matrix

| Condition | Status | Code |
|---|---|---|
| No `Cf-Access-Jwt-Assertion` header | 401 | `AUTH_REQUIRED` |
| Malformed token | 401 | `AUTH_INVALID` |
| Invalid signature | 401 | `AUTH_INVALID` |
| Expired | 401 | `AUTH_INVALID` |
| Not yet valid (`nbf`) | 401 | `AUTH_INVALID` |
| Wrong issuer | 401 | `AUTH_INVALID` |
| Wrong audience | 401 | `AUTH_INVALID` |
| Unknown `kid` | 401 | `AUTH_INVALID` |
| No `email` claim | 401 | `AUTH_INVALID` |
| Valid, not allow-listed | 403 | `FORBIDDEN` |
| Valid, `ALLOWED_EMAILS` unset | 403 | `FORBIDDEN` |
| Valid and allow-listed | 200 | — |
| `POST`/`PUT`/`DELETE`/`OPTIONS` on `/api/session` | 405 | `METHOD_NOT_ALLOWED` |
| Unknown path | 404 | `NOT_FOUND` |

**Every authentication failure returns one code.** `AUTH_INVALID` deliberately
does not distinguish expired from wrong-audience from bad-signature. Distinct
codes would let an attacker probe which check failed and tune a forgery
attempt against it. The specific reason goes to `console.warn` server-side,
where debugging actually happens.

**Order matters:** method and route are resolved before authentication, so a
`DELETE /api/nonsense` costs no crypto. Authentication precedes any handler.

---

## E. Security headers

Applied to **every** response, including 401/403/404/405 — an error response
rendered in a browser is still a browser context.

| Header | Value | Why *here* |
|---|---|---|
| `Content-Type` | `application/json; charset=utf-8` | explicit charset; prevents encoding-sniffing games |
| `X-Content-Type-Options` | `nosniff` | stops a browser re-interpreting a JSON error body as HTML or script |
| `Cache-Control` | `no-store` | **the important one.** These responses are per-identity. A cached `{"authenticated":true,"email":…}` on a shared device, or at any intermediary, is an identity leak. `no-store` rather than `no-cache`: do not write it down at all |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; sandbox` | for a JSON API `default-src 'none'` is exactly right — this endpoint legitimately needs to load nothing. Becomes load-bearing when the same origin later serves the UI |
| `Referrer-Policy` | `no-referrer` | admin URLs and any future query state must not travel to third parties |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | **near-zero value in Phase 2** — a JSON response has no browsing context to restrict. Included because it costs nothing and is correct the moment this origin serves the UI, and because photo upload uses a file picker, which needs no camera grant |
| `X-Frame-Options` | `DENY` | redundant with `frame-ancestors` for current browsers; kept as belt-and-braces for anything older |

### `Strict-Transport-Security` — set at the zone, not the Worker

HSTS is a property of the hostname, and it must apply to responses the Worker
never sees (redirects, Access's own challenge pages, error pages). A Worker can
only set it on responses it generates, which is the subset that matters least.
Setting it at zone level in Cloudflare covers all of them.

It also needs care rather than a copied value: `includeSubDomains` on the apex
would bind every current and future subdomain to HTTPS-only, and `preload` is
effectively irreversible. Recommendation: set at zone level for
`drkhalilkanani.com`, `max-age` starting conservative, decide
`includeSubDomains`/`preload` as a separate deliberate call — not as a side
effect of this phase. **No Cloudflare change in Phase 2.**

---

## F. CSRF / CORS / origin model

### The architecture: same-origin, so there is no CORS

The admin UI will be served from `admin.drkhalilkanani.com` — the same origin
as the API. Therefore:

- **No `Access-Control-Allow-Origin` header is ever sent.**
- **No `OPTIONS` handler.** Same-origin requests do not preflight, so an
  `OPTIONS` arriving at all means a cross-origin caller. It gets 405.
- The public site (`www.drkhalilkanani.com`) never calls this Worker, in either
  direction. Phase 1's guarantee that the public site has no runtime dependency
  on any Worker is preserved.

This is the strongest available position and it is free: the absence of CORS
headers is itself the cross-origin defence, because the browser refuses to
surface the response.

### CSRF: the header is the defence

Access issues **both** a `CF_Authorization` cookie and a
`Cf-Access-Jwt-Assertion` header. The distinction is the entire CSRF story:

- A **cookie** is attached automatically by the browser to cross-site
  requests. If the Worker accepted the cookie as proof, `evil.test` could POST
  a form to a future mutation endpoint and the browser would authenticate it.
- A **header** is not. `Cf-Access-Jwt-Assertion` is injected by Cloudflare's
  edge on requests that pass through Access. A cross-site form post cannot set
  it, and a cross-origin `fetch` that tries is blocked by CORS before it is
  sent.

**So: the Worker reads the header and never the cookie, and that alone makes
it CSRF-resistant.** Not incidentally — by design, and it is worth a test that
asserts a cookie-only request is refused.

`CF_Authorization`'s `SameSite` attribute is set by Cloudflare and outside our
control, which is a second reason not to depend on it.

### Additional controls for future mutation endpoints

Defence in depth, to be added with the first mutating route — listed here so
the model is decided now rather than improvised then:

1. `Origin` must equal `https://admin.drkhalilkanani.com`; absent or different
   is refused. Checked server-side, because CORS constrains browsers and a
   browser is not the only thing that can issue a request. (The appointment
   Worker already works this way.)
2. `Content-Type: application/json` required. A cross-origin request cannot set
   it without triggering a preflight, which the absence of CORS headers then
   fails.
3. State-changing methods on a route that does not declare them → 405, never
   a silent fallthrough to `GET` behaviour.

### Rate-limit insertion point

Phase 2 adds **no rate-limiting code**. The control is a Cloudflare WAF rate
limiting rule on the hostname — configuration, not code, and the same approach
already used for the mail relay.

If a WAF rule proves insufficient, the in-code insertion point is defined: in
the router, **after** method/route resolution and **before** JWT verification.
That position is deliberate — it is past the cheap rejections, so a flood of
404s costs nothing, and before the expensive asymmetric crypto and any JWKS
fetch, which is the resource actually worth protecting.

---

## G. Configuration and secrets model

Derived from the architecture, and split by *what a leak would cost*.

### Non-secret — `workers/admin/wrangler.toml` `[vars]`

| Name | What | Why not secret |
|---|---|---|
| `ACCESS_TEAM_DOMAIN` | `<team>.cloudflareaccess.com` | Public hostname. Issuer and JWKS URL are **derived** from it, so there is one value to change and no possibility of issuer and JWKS URL disagreeing |
| `ACCESS_AUD` | Access application AUD tag | An identifier, not a credential. Knowing it does not help forge a token — that needs Cloudflare's private key. Belongs in a diff where a change to it gets reviewed |
| `ADMIN_ORIGIN` | `https://admin.drkhalilkanani.com` | The site's own public hostname |

No `ACCESS_ISSUER` or `ACCESS_JWKS_URL` var: both are `ACCESS_TEAM_DOMAIN`
with a fixed prefix/suffix. Storing them separately creates two values that
can drift, and a JWKS URL pointing at a different team than the issuer check
is a real vulnerability.

### Secret — `wrangler secret put`

| Name | What | Why secret |
|---|---|---|
| `ALLOWED_EMAILS` | comma-separated identities | Not a credential, but **personal addresses**, and this repository is public. A personal email committed to a public repo is scraped and spammed within days and cannot be undone. Identical reasoning to `MAIL_TO` on the mail relay |

**Remains unset in Phase 2. Unset means refuse everyone.**

### Deliberately absent

`GITHUB_TOKEN` is **not** in the `Env` interface, not in `wrangler.toml`, and
not created. A Worker that cannot name a credential cannot leak it, and typing
it early invites a "temporary" binding. It arrives in the phase that writes to
GitHub.

### Isolation from the appointment Worker

Separate directory, separate `wrangler.toml`, separate Worker name
(`drkanani-admin`), separate secret store, separate custom domain. **No shared
secret, no shared binding, no shared configuration, no shared code.** The two
Workers have different blast radii — one can send email, the other will be able
to publish to the website — and nothing is gained by coupling them. The mail
relay is not modified by this phase in any way.

---

## H. GitHub boundary — designed now, built later

No GitHub code, client, or abstraction in Phase 2. Deferring the client is
correct: an abstraction written before its first caller gets the shape wrong.

When it arrives, the token must be:

- a **fine-grained** PAT, not classic
- scoped to **exactly one repository**
- `Contents: Read and write` — and nothing else. No workflow, no actions, no
  packages, no account scope, no org scope
- a **Wrangler secret**, Worker-side only
- never returned in a response body or header, never `console.log`ged, never
  included in an error, and never interpolated into a message that reaches the
  browser

And the request shape must be constrained so the token's authority cannot be
redirected: the client never supplies owner, repo, ref or path. All four are
Worker constants, and the writable paths are a hard allow-list
(`src/data/hours.json`, `src/data/clinic-photography.json`,
`src/assets/images/<server-generated filename>`).

---

## I. Error contract

Every response, success or failure, is one of two shapes:

```json
{ "ok": true,  "data": { } }
{ "ok": false, "error": { "code": "AUTH_REQUIRED" } }
```

`code` is a stable machine-readable string. No `message`, no `detail`, no
`reason` field reaches the browser — a field that exists will eventually be
filled with something useful to an attacker.

| Code | Status | Meaning |
|---|---|---|
| `AUTH_REQUIRED` | 401 | No assertion header present |
| `AUTH_INVALID` | 401 | Token present but did not verify — any reason |
| `FORBIDDEN` | 403 | Verified identity, not on the allow-list |
| `NOT_FOUND` | 404 | Unknown route |
| `METHOD_NOT_ALLOWED` | 405 | Known route, wrong method |
| `SERVER_ERROR` | 500 | Unexpected failure |

Six codes. None speculative — each maps to a branch that exists.

### Logging

`console.warn` / `console.error` may record the specific verification failure,
the route, and the method, because a rejection nobody can explain afterwards is
how the honeypot incident on the mail relay stayed invisible.

Logs must **not** record the raw JWT, any signature or key material, any
`Env` value, or the full claim set. The authenticated email may be logged on a
*successful* privileged action, because knowing who published something is the
point of an audit trail — but not on failures, which would build a log of
addresses that tried.

---

## J. File plan

### CREATE

| Path | Responsibility |
|---|---|
| `workers/admin/wrangler.toml` | name, entry, compatibility date, `[vars]`, and a comment naming the out-of-band secret |
| `workers/admin/src/index.ts` | router, method allow-list, wiring. No crypto, no claim logic |
| `workers/admin/src/auth.ts` | Access JWT verification, claim validation, email normalisation, allow-list |
| `workers/admin/src/http.ts` | `Env` type, response helpers, error codes, security headers |
| `workers/admin/README.md` | what it is, how to configure it, what is deliberately absent |
| `tests/helpers/access-jwt.ts` | offline key/JWT/JWKS factory. **Not** `*.test.ts`, so the runner does not execute it as a suite |
| `tests/unit/admin-auth.test.ts` | the §K matrix |

Three source files rather than one: routing, verification and transport are
independently testable and the repository's convention is small focused files.
`auth.ts` in particular should be readable end-to-end without scrolling past
routing.

### MODIFY

| Path | Change |
|---|---|
| `package.json` | add `jose` to `dependencies`. No script change — `tests/unit/*.test.ts` already matches |
| `HANDOFF.md` | record Phase 2 state |

### UNCHANGED — asserted, not assumed

`workers/appointment-email/**` · all of `src/` · `astro.config.mjs` ·
`src/data/hours.json` · `src/data/clinic-photography.json` ·
`scripts/**` · `.github/workflows/**` · every existing test.

### Open, needs a decision

`tsconfig.json` lists `./worker-configuration.d.ts` in `include`, and **that
file does not exist** — pre-existing, harmless today because TypeScript
tolerates a missing include entry, and `astro check` is clean. Phase 2 is when
it starts to matter, because the admin Worker wants Workers types. Options:
generate it (`wrangler types`, which means adding `wrangler` as a dev
dependency), add `@cloudflare/workers-types`, or drop the stale entry and rely
on `jose` plus the standard lib. I lean toward dropping the stale entry and
adding nothing, since the Worker's surface is `Request`/`Response`/`fetch`,
all of which the standard lib already types — but it is your call and it is
listed rather than decided.

---

## K. Test matrix

All offline. **Verified feasible before proposing:** Node 22's `crypto.subtle`
generates RSA-2048 keys, signs RS256, exports a JWK with a `kid`, and detects a
tampered payload — so tests exercise *real* signature verification rather than
weakening production code to accommodate them.

`tests/helpers/access-jwt.ts` provides a signing key, a matching JWKS, and a
`makeToken({ iss, aud, email, exp, nbf, kid })` factory. The JWKS is supplied
to the verifier through a parameter (§L) — no network, no `wrangler dev`, no
miniflare, no flake.

| # | Case | Expected |
|---|---|---|
| 1 | No `Cf-Access-Jwt-Assertion` header | 401 `AUTH_REQUIRED` |
| 2 | `"not.a.jwt"` | 401 `AUTH_INVALID` |
| 3 | Valid claims, signed by a **different** key | 401 `AUTH_INVALID` |
| 4 | Payload tampered after signing | 401 `AUTH_INVALID` |
| 5 | `exp` in the past | 401 `AUTH_INVALID` |
| 6 | `nbf` in the future | 401 `AUTH_INVALID` |
| 7 | Wrong `iss` | 401 `AUTH_INVALID` |
| 8 | Wrong `aud` | 401 `AUTH_INVALID` |
| 9 | `aud` array not containing ours | 401 `AUTH_INVALID` |
| 10 | Unknown `kid` | 401 `AUTH_INVALID` |
| 11 | `alg: none`, no signature | 401 `AUTH_INVALID` |
| 12 | No `email` claim | 401 `AUTH_INVALID` |
| 13 | Service-token shape (`common_name`, no `email`) | 401 `AUTH_INVALID` |
| 14 | Valid, email not in allow-list | 403 `FORBIDDEN` |
| 15 | Valid, `ALLOWED_EMAILS` **unset** | 403 `FORBIDDEN` |
| 16 | Valid, `ALLOWED_EMAILS` empty string | 403 `FORBIDDEN` |
| 17 | Valid, `ALLOWED_EMAILS` `",  , "` | 403 `FORBIDDEN` |
| 18 | Valid + allow-listed | 200, `{ok:true}` |
| 19 | `"  Owner@Example.Test "` vs allow-list `"owner@example.test"` | 200 — trim + case only |
| 20 | `a.b@x.test` vs allow-list `ab@x.test` | 403 — **no** dot folding |
| 21 | `a+tag@x.test` vs allow-list `a@x.test` | 403 — **no** plus stripping |
| 22 | Allow-list entry with stray spaces/mixed case | 200 — both sides normalised identically |
| 23 | `POST` / `PUT` / `DELETE` / `OPTIONS` on `/api/session` | 405 `METHOD_NOT_ALLOWED` |
| 24 | `GET /api/unknown`, `GET /`, `GET /../etc` | 404 `NOT_FOUND` |
| 25 | Valid token supplied **only** as `CF_Authorization` cookie | 401 — cookie is never read |
| 26 | Response body never contains the raw JWT (all cases) | asserted on the serialised body |
| 27 | Response never contains any `Env` value (all cases) | asserted on the serialised body |
| 28 | Error responses carry the full §E header set | asserted |
| 29 | Success response carries `Cache-Control: no-store` | asserted |
| 30 | No `Access-Control-Allow-Origin` on any response | asserted |
| 31 | Auth failures expose one code only — 2–13 are indistinguishable to the client | asserted across cases |

Case 31 is the oracle test and matters as much as any single rejection.

Cases 26/27 iterate every response in the suite and assert the token string and
each `Env` value are absent — a standing guarantee rather than a spot check, so
a future field that accidentally echoes config fails the suite.

---

## L. Local development — no bypass, ever

**There will be no `if (DEV) bypassAuthentication()`.** No environment flag, no
`ENVIRONMENT=development` branch, no "skip auth when the header is missing and
we're on localhost". A bypass is one misconfigured variable away from being
production behaviour, and it would be the single highest-value line in the
repository for an attacker.

### The seam is data, not a flag

`auth.ts` exports a verifier factory whose JWKS source is a **parameter with a
production default**:

- production: `index.ts` calls it with no override → the real
  `createRemoteJWKSet` built from `ACCESS_TEAM_DOMAIN`
- tests: call it with the generated local JWKS

The same verification code runs in both. Nothing is skipped, nothing is
weakened, and there is no branch that could take the wrong side in production —
the only difference is *which public keys* are consulted, and an attacker
cannot supply those.

### Manual local runs

You cannot obtain a genuine Access assertion on `localhost`, and manufacturing
one would mean trusting a key the Worker should not trust. So the admin Worker
is not exercised end-to-end locally. Confidence comes from:

1. the §K suite, which exercises real crypto offline, and
2. a single manual check against a **preview deployment behind a real Access
   application** — in the later phase that creates that infrastructure, and
   explicitly including an attempt from a non-allow-listed identity **before**
   any GitHub token exists.

If a UI later needs a local dev loop, it mocks `/api/session` in the UI's own
dev server. The Worker's auth path stays untouched.

---

## M. Cloudflare infrastructure — plan only, zero changes

**Nothing in this section is performed in Phase 2.** Listed so the order is
agreed in advance, because parts of it are mine to do and parts are yours.

| Step | Detail | Who |
|---|---|---|
| 1 | Worker `drkanani-admin`, no routes bound yet | Claude, on approval |
| 2 | Zero Trust → Access → **self-hosted application** for `admin.drkhalilkanani.com` | **You** — Zero Trust config is not reliably reachable from my tooling, and the identity list is yours to own |
| 3 | Identity provider: **one-time PIN (email OTP)**. No third-party IdP, nothing new to trust | You |
| 4 | Policy: **Allow**, include → *Emails* → the two addresses. Default deny | You |
| 5 | Session duration: short — 24h or less | You |
| 6 | Copy the application's **AUD tag** into `ACCESS_AUD` | You → Claude |
| 7 | `wrangler secret put ALLOWED_EMAILS` (same two addresses) | You, or Claude with values supplied out of band |
| 8 | Bind the Worker custom domain `admin.drkhalilkanani.com` (creates DNS + cert) | Claude, with approval |
| 9 | WAF rate-limiting rule on the hostname | Claude, with approval |
| 10 | Zone-level HSTS decision (§E) | You |

**Ordering constraint:** the Access application (2–5) must exist and be
verified **before** the custom domain (8) makes the Worker reachable. Binding
the domain first exposes an unprotected hostname — and while the Worker would
still refuse everything, that is the perimeter and the verification both being
absent at once.

**Verification before any token exists:** attempt to reach the panel from an
identity that is *not* allow-listed and confirm refusal, while the Worker still
holds nothing but an auth shell. Getting a "no" from a Worker that cannot write
anything is the cheapest possible time to discover the policy is wrong.

Additionally: confirm the Worker's `workers.dev` subdomain is **disabled**, so
`admin.drkhalilkanani.com` is the only route in. This is exactly the
Access-bypass case independent verification protects against, but there is no
reason to leave the door in the wall.

---

## N. Acceptance criteria — Definition of Done

Phase 2 is done when **all** hold:

1. **Fails closed.** Unset/empty `ALLOWED_EMAILS` refuses every request, valid
   token or not. No default identity, no "empty means all".
2. **Real verification, not decode-only.** A token with valid claims and an
   invalid signature is refused. Proven by a test signed with a foreign key.
3. **Full claim validation.** Issuer, audience, signature, `exp` and `nbf` all
   enforced, each with its own failing test.
4. **`alg` never taken from the token.** RS256 pinned; `alg: none` refused.
5. **Allow-list enforced server-side**, after cryptographic verification, never
   from a client-supplied value.
6. **Cookie never trusted.** A valid token presented only as `CF_Authorization`
   is refused.
7. **No secret reaches the browser.** No `Env` value and no raw JWT appears in
   any response body or header, asserted across every response in the suite.
8. **No auth bypass exists.** No environment flag, no dev branch, no code path
   where a missing or invalid assertion yields 200. The test seam is a JWKS
   parameter, not a skip.
9. **One code for all auth failures.** The client cannot distinguish expired
   from wrong-audience from bad-signature.
10. **Security headers on every response**, errors included.
11. **No CORS headers**, no `OPTIONS` handler.
12. **`GITHUB_TOKEN` absent** from the `Env` type, the config and the account.
13. **Tests clean**: the full suite green, `npm run verify` clean, 0 type errors.
14. **Public site unchanged**: the §O comparison shows 0 of 128 files changed.
15. **Appointment Worker untouched**: no diff under
    `workers/appointment-email/`, no shared secret or binding.
16. **No production infrastructure mutated**: no Cloudflare, DNS, Access,
    domain, route or secret created or changed.

---

## O. Phase 1 baseline and output comparison

The accepted Phase 1 output is the baseline:

```
128 files · 47 HTML pages · 0 differences
SHA-256 tree digest: feb3e37bf72ddd3fa431b7d71c73eb82eb656e085a7e69cf2cd22cfe72c98652
```

The comparison is repeated after Phase 2 with the same recipe. Phase 2 touches
no site code, so the expected result is **0 of 128 changed**.

The one plausible way that could fail is adding `jose` to `package.json`
perturbing the build. If any file differs, it is investigated and explained —
not normalised away, not accepted silently, and not made to pass by adjusting
the comparison.

---

## P. Rollback

| Layer | Action | Effect |
|---|---|---|
| Code | `git revert` the Phase 2 commits, or abandon the branch | Repository returns to the Phase 1 baseline |
| Dependency | remove `jose` from `package.json` | No site impact — it was never imported by site code |
| Worker | delete the `drkanani-admin` Worker | Nothing else references it |
| Domain | remove the custom domain binding | `admin.drkhalilkanani.com` stops resolving |
| Access | delete the Access application | No identity can reach the hostname |

**The public site is unaffected by every row above.** It has no runtime
dependency on this Worker — Phase 1 preserved that, and Phase 2 does not
introduce one. Rolling Phase 2 back cannot take the clinic's website down, and
that property is worth keeping through every later phase.

Rollback of steps 8/9 in §M is a Cloudflare dashboard action, reversible in
minutes, with no data to lose: the Worker stores nothing.

---

## Q. Risks and open questions

### Needs you

1. **`ALLOWED_EMAILS` values.** Two addresses, supplied out of band — not in
   chat, not in a file, not in a commit. Until then the Worker refuses
   everyone, which is the correct resting state.
2. **`ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`** do not exist until the Access
   application does. Phase 2 therefore ships code and tests with configuration
   unset; deployment is a later phase. This is a sequencing fact, not a blocker.
3. **`worker-configuration.d.ts`** (§J) — which of the three options.
4. **Returning `email` from `/api/session`** (§D) — my recommendation is to
   include it; say if you would rather it were omitted.
5. **Zone-level HSTS** (§E) — a deliberate decision, not a side effect of this
   phase.

### Technical risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| JWT verification subtly wrong | Medium — this is the classic place to get it wrong | A maintained library, `alg` pinned, and a 31-case matrix testing the failure modes rather than the happy path |
| Adding `jose` perturbs the site build | Low | §O comparison; investigated, not normalised, if it does |
| Access misconfigured, Worker reachable unprotected | Low | Independent verification means the Worker refuses anyway; `workers.dev` disabled; non-allow-listed identity tested before any token exists |
| JWKS fetch failure makes the panel unavailable | Low | Fails **closed** — unavailable, never open. Acceptable: the panel is a convenience, and the website does not depend on it |
| Unknown-`kid` flood causing repeated JWKS fetches | Low | `createRemoteJWKSet`'s built-in cooldown — a specific reason to use the library rather than hand-roll |
| Phase 2 code drifts before Phase 4 uses it | Medium | Acceptance criteria are executable tests, so drift breaks the suite |

### Named non-risks

- **Patient data**: none stored, none transited. This Worker never sees any.
- **Mail relay**: untouched, separate Worker, separate secrets, separate
  domain. A Phase 2 failure cannot stop appointment requests arriving.
- **Public website**: no runtime dependency, in either direction.

---

## R. What this proposal deliberately does not do

- No endpoint that Phase 2 cannot justify
- No GitHub client "ready for later"
- No rate-limiting no-op
- No `GITHUB_TOKEN` in the type
- No health endpoint that Access makes unreachable
- No dev bypass
- No Cloudflare change
- No hand-rolled cryptography
