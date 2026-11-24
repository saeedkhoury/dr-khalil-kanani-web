# Visual CMS

`admin.drkhalilkanani.com` is **the website with Edit Mode on**, not an
administration dashboard.

The doctor browses the same pages patients browse — same layout, typography,
sections, images and responsive behaviour — and where content is CMS-managed a
small pencil appears beside it. He edits what he is looking at.

This supersedes the earlier "opening hours and gallery only" design, and
ADR 0004's "no CMS" position.

## Why it is built this way

A separate admin dashboard is a second product: it drifts from the site, and
what the doctor approves there is not what patients receive. Reusing the same
Astro components makes the preview real rather than an approximation.

That claim is enforced mechanically:

```bash
npm run build && npm run build:admin && npm run verify:same-site
```

`scripts/compare-admin-public.mjs` strips the editor chrome from all 47 admin
pages and requires what remains to equal the public page exactly. If Edit Mode
ever drifts into its own design, this fails.

## Two builds, one codebase

| | Public | Admin |
|---|---|---|
| Command | `npm run build` | `npm run build:admin` |
| Flag | — | `VISUAL_CMS=1` |
| Output | `dist/` | `workers/admin/dist/` |
| Editor bar, pencils, editor JS | **never** | yes |
| Sitemap | yes | no |
| `noindex` | no | yes |

The public build contains no editor string, no editor asset and no admin API
reference. Tests assert each of those absences.

## What is editable

| Area | Edited from | Stored in |
|---|---|---|
| Hero and site copy | the text itself | `src/data/managed-copy.json` |
| Doctor profile | the doctor section | `src/data/doctor-profile.json` |
| Treatments | the treatments grid | `src/data/services.json` |
| FAQ | the FAQ accordion | `src/data/general-faq.json` |
| Opening hours | the location/contact area | `src/data/hours.json` |
| Contact facts | the contact area | `src/data/contact-facts.json` |
| Clinic photography | the gallery | `src/data/clinic-photography.json` |

### Developer-managed, deliberately

**`treatmentWork`** — the treatment-result photographs — is not CMS-managed
and cannot become so by accident. It lives inline in `src/data/media.ts`,
which is not a target the Worker's path allow-list can express, so the Worker
cannot write that file at all. Three independent checks enforce it and each
has a test.

Legal, privacy, accessibility and security copy also stay developer-managed.

## Managing photographs

Upload (one or several at a time), replace, publish, unpublish, delete, and
**drag to reorder** — array order is display order, so dragging *is* the sort.

- Filenames are generated server-side from the category and the real format
  read from the file's own bytes. The browser never sends, sees or influences
  a repository path.
- A new photograph is stored **unpublished**, and cannot be published until it
  has reviewed English alt text. Arabic text seeded into the English field is
  a placeholder, never a translation, and `needsEnglishReview` blocks
  publication until someone writes real English.
- Permanent delete is reachable only from the unpublished state.
- Zero published photographs is valid: the section disappears cleanly, with no
  empty heading or shell.

### Dragging, and the buttons beside it

Reordering uses **Pointer Events**, not HTML5 drag-and-drop, which never fires
on touch — and the doctor reorders his gallery on a phone.

The Up/Down buttons are not a lesser fallback. Dragging is unreachable by
keyboard and by screen reader, so the two are the same feature offered twice:
the buttons carry the accessible names and the grip is `aria-hidden`.

## Publishing

```
Edit → Save → validate → commit → build/deploy → status by exact commit SHA
```

**A commit is not a publication.** `published` is set only when the workflow
for that exact SHA concludes `success`; anything else is `committed` or
`failed`. When publication fails the site is unaffected — GitHub Pages keeps
serving the last successful deployment — and the panel says exactly that.

Status is keyed on the SHA rather than browser state, so it survives a locked
phone, a reload, or a different device.

## Unpublished content is not private

The repository is **public**. "Unpublished" controls website visibility, not
confidentiality: an unpublished photograph or a hidden treatment is still
readable by anyone who looks at the repository.

Never put patient data, medical information, credentials or secrets into
CMS-managed content. The editor says so on every screen.

## Security

Unchanged from the audited model, and preserved by this work:

- Cloudflare Access in front; the Worker independently verifies the assertion
- RS256 pinned, issuer, audience, `exp` and `nbf` all validated
- `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` must be present and usable, or every
  request is refused
- `ALLOWED_EMAILS` checked server-side, fail-closed when unset
- `Cf-Access-Jwt-Assertion` only — the `CF_Authorization` cookie is never a
  credential, which is what makes this CSRF-resistant
- `Origin` checked server-side on every mutation; no CORS headers at all
- Fixed `WriteTarget` model: callers name a kind, never a repository path
- Owner, repository and branch are Worker values; `CONTENT_BRANCH` is required
  and never defaults to `main`
- GitHub token is Worker-side only and never reaches a response or a log
- SHA optimistic concurrency, with retry only where re-applying is idempotent

## Not yet connected

**BLOCKED — REQUIRES PRODUCTION CONFIGURATION.** No Access application,
custom domain, DNS, WAF rule or GitHub token exists, and no commit has ever
been made to a real repository. Every unset value makes the Worker refuse.
Local verification uses mocked GitHub, generated JWTs and `example.test`
identities.
