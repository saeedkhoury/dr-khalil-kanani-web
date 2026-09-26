# Admin Worker

The clinic owner's panel for `admin.drkhalilkanani.com`. Two jobs: opening
hours, and clinic photographs.

Everything it can do is behind a Cloudflare Access assertion that the Worker
verifies itself, and every repository write goes through a path allow-list the
caller cannot address around.

## Status

**NOT DEPLOYED. NOT CONFIGURED.** No Cloudflare Access application exists, no
custom domain is bound, and no secret is set. `ALLOWED_EMAILS` is unset, which
means the Worker **refuses everyone** — including a perfectly valid, correctly
signed Access token. That is the intended resting state.

## What it does

| | |
|---|---|
| Routing | exact paths, explicit methods. Everything else 404 or 405 |
| Authentication | independently verifies the Cloudflare Access JWT |
| Authorisation | checks the email claim against `ALLOWED_EMAILS` |
| Opening hours | read and replace, validated against the build's own schema |
| Clinic photographs | add, publish, unpublish, delete permanently |
| Publication status | by commit SHA, so a locked phone loses nothing |
| The panel | server-rendered Hebrew/RTL, same origin as the API |

## What it deliberately does not do

No unauthenticated endpoint of any kind · no CORS · no rate-limiting code ·
no ability to write anything outside three allow-listed paths · **no
development authentication bypass**.

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

### Repository access — present, unconfigured, unreachable

`GITHUB_TOKEN` and `CONTENT_BRANCH` are now in the `Env` type, both optional
because unset is a real deployment state that must be handled by refusing.

**Neither is set**, so repository reads and writes refuse. When configured,
the token must be a **fine-grained** PAT scoped only to
`saeedkhoury/dr-khalil-kanani-web` with `Contents: Read and write` and
`Actions: Read`. No Workflows write, packages, account or organisation scope.
GitHub documents [Contents read/write for file operations](https://docs.github.com/en/rest/repos/contents),
[Contents read for commit discovery](https://docs.github.com/en/rest/commits/commits#list-commits),
and [Actions read for authenticated workflow-run listing](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow).
The Worker sends this token on every GitHub request, including status reads;
do not rely on the public-repository unauthenticated-read exception.

`CONTENT_BRANCH` deliberately has **no default**. Defaulting to `main` would
mean a misconfigured deployment publishes straight to the live website.

BLOCKED — REQUIRES PRODUCTION CONFIGURATION.

## Repository writes

A caller **cannot name a path**. It names a target:

| Target | Path |
|---|---|
| `{ kind: 'hours' }` | `src/data/hours.json` |
| `{ kind: 'photography' }` | `src/data/clinic-photography.json` |
| `{ kind: 'image', file }` | `src/assets/images/<file>` |

The owner, repository and branch are Worker values, never parameters. This is
stronger than validating a path string: validation can miss a case nobody
thought of, but a caller with no way to *express* `.github/workflows/deploy.yml`
cannot ask for it however the request is crafted.

Image filenames must match the documented convention exactly — lowercase
ASCII, hyphen separated, two-digit index, `.jpg`/`.jpeg`/`.png`. **SVG is
refused**: it can carry script, and no photograph is a vector.

Commit messages come from a closed verb union plus the authenticated address,
which is shape-checked first — a newline in an email claim would otherwise
grow a commit body nobody wrote. No user text reaches a commit message.

Conflicts are never retried. Hours saves include the blob SHA loaded by the
form; a mismatch with the current repository blob returns 409 before writing.
GitHub also rejects a race after that read. The panel reports the conflict and
reloads current values for review. Whole-week replacement is idempotent, but
retrying it against a newer SHA would still destroy another editor’s work.

## Email matching

`trim()` then `toLowerCase()`. Nothing else.

No dot-folding and no `+tag` stripping: both are provider-specific rewrites
that change *who matches*. Folding `a.b@example.test` to `ab@example.test`
could admit an address that was never listed; stripping `+tag` could reject one
that was. Access returns the address as the identity provider verified it, and
the allow-list is a short list its owner controls.

## API

Every route requires a verified, allow-listed Access identity. Mutations
additionally require `Origin: <ADMIN_ORIGIN>` and `Content-Type:
application/json`, checked server-side.

| Route | Methods | Purpose |
|---|---|---|
| `/` · `/panel.js` · `/panel.css` | GET | the panel itself |
| `/api/session` | GET | who is signed in |
| `/api/hours` | GET · PUT | read and replace the week |
| `/api/photos` | GET · POST | list, and add one |
| `/api/photos/publish` · `/unpublish` · `/delete` | POST | change one photograph |
| `/api/status?sha=` · `/api/status/latest` | GET | where a change got to |

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


## Opening hours

`PUT /api/hours` accepts `{ rows, sha }` and replaces all seven rows at once
only if the form revision is still current. Because the file contains
nothing but hours, there is no adjacent content to corrupt — no regex, no AST,
no dependency.

The admin rules are **stricter than the build's**. The site may ship with
hours not yet supplied, and `hasHours()` hides the block. But a day marked
open *from the panel* must say when: the doctor was looking at the form when
he ticked it, so a half-filled row is an accident rather than a state anyone
chose. Closed days are normalised — the form disables the time inputs, so
whatever they last held is meaningless.

The final gate is the **build's own validator**, imported rather than
reimplemented, so the Worker cannot commit hours that `npm run build` would
reject. That failure mode would be a change that silently never went live.

A stale SHA is retried **once**, which is safe only because hours are replaced
wholesale: re-applying reproduces exactly what the doctor asked for.

## Clinic photographs

Images are identified from their **own bytes**, never the filename. SVG, GIF,
WebP, HTML, a renamed script and truncated/header-only images are refused.
PNG inspection checks chunk bounds, IHDR, contiguous IDAT, IEND and every CRC;
JPEG inspection checks bounded marker segments, frame, scan data and final EOI.
Neither format's compressed pixels are decoded in the Worker, so this is a
bounded structural check, not a guarantee that every decoder will render the
image. Filenames
are **generated server-side** from the category and the real format; the client
never sends, sees or influences a repository path.

The patient-content confirmation is checked **server-side**, because a
client-side gate only stops the honest path. Without it nothing is committed,
and the commit message records that it was given.

Ordering is deliberate in both directions:

- **Add** — the image is committed first, the manifest second. A failure
  between them leaves an unreferenced file, which renders nothing. The reverse
  would publish a manifest pointing at a missing file and fail the build for
  everyone.
- **Delete** — the reference goes first, the file second, for the same reason.

Unpublishing keeps the record and the file, so it is reversible. Permanent
delete is reachable only from the unpublished state. Zero published
photographs is valid.

An append is **never retried** — a retry could double-add.

## Publication status

**A commit is not a publication.** `published` is set only on
`conclusion: success`; everything else is `committed` or `failed`. Where a SHA
has several runs the strictest answer wins.

Status is keyed on the commit SHA rather than browser state, so
`/api/status/latest` can answer from a new device by finding the most recent
`cms(` commit. `localStorage` is a convenience, never the mechanism.

When publication fails the site is unaffected — GitHub Pages keeps serving the
last successful deployment — and the panel says exactly that.

## The panel

Server-rendered Hebrew, RTL, mobile first, from the same origin as the API.
The tokens are mirrored from `src/styles/global.css` and a test asserts they
match, so there is one design system rather than two that can drift.

A test rejects every physical CSS property, because a physical property is
invisible in Hebrew until someone opens the panel in English. Another asserts
`--color-signal` is never used for text (3.28:1), and another rejects
`box-shadow` and gradients.

The document CSP is `script-src 'self'; style-src 'self'` with no
`'unsafe-inline'` — the stylesheet and script are served as their own routes
rather than inlined. The API keeps the stricter `default-src 'none'`.

## Browser tests

`scripts/serve-admin-fixture.ts` runs the **real Worker** over loopback with
GitHub mocked, so `tests/e2e/admin.spec.ts` exercises the rendered panel.

It is not an auth bypass: the Worker is unmodified and still requires a valid
assertion, so the harness mints a real RS256 token with a generated key and
serves the Worker a matching JWKS. Every check runs. It binds to loopback,
refuses to start with `NODE_ENV=production`, and blocks any outbound URL that
is not the JWKS or `api.github.com`.

## Not verified against real infrastructure

**BLOCKED — REQUIRES APPROVED INTEGRATION TEST CONFIGURATION.** No commit has
ever been made to a real repository, and no real Access application exists.
Local tests prove the exact request that *would* be sent — repository, branch,
allowed path, expected SHA, encoded content and sanitised commit message —
without sending it.


## Local audit remediation — 2026-09-24

The current recovery and verification source of truth is the
[local remediation audit](../../docs/audits/2026-09-24-admin-cms-remediation.md).
Its reconstructed matrix records 54 local passes and seven integration blocks.
No remote configuration or mutation was performed.

CMS text is checked by the shared claims rules before upload commits and by
CI over decoded JSON alt/caption strings. Both workflows explicitly run the
shared data validator. The existing public About page renders published clinic
photography; its empty state changes no current public bytes.

Filename allocation inventories the fixed repository image directory, merges
those names with manifest names, and chooses a free two-digit slot. It never
replaces or deletes an orphan to make space. API errors, 99 occupied category
slots, or a possibly truncated directory inventory fail explicitly.

Known-SHA publication status queries only the production deployment workflow.
Latest-change discovery pages data history against a fixed commit, with a
bounded unavailable response if the answer cannot be proved. It never treats
an exhausted search as no CMS change. See the audit for exact availability
bounds and tests. Real GitHub permissions/branch/deployment behavior remains
blocked pending approved integration configuration.
