# Admin CMS — design

**Status:** Approved by the owner, 2026-09-22 · Not yet implemented
**Supersedes:** ADR 0004's "no CMS" position, whose own revisit trigger
("the owner asks twice, unprompted") has now been met.

A small panel at `admin.drkhalilkanani.com` letting Dr. Kanani do two things
without messaging the developer:

1. **Edit opening hours**
2. **Add and remove gallery photographs**

Nothing else. Explicitly not a CRM, not a treatment-text editor, and not a
review uploader.

---

## 1. Why these two, and nothing else

The owner was asked what he actually needs to change. The answer was hours and
photographs. Everything else on the site — treatment descriptions, the bio, the
FAQ — has changed approximately never; the clinic has nine Instagram posts in
its entire history.

Restricting scope to these two is not laziness, it removes the hardest problem
in the build. **Treatment text is where the Israeli advertising-claims risk
lives.** An editor for it would need the claims linter surfaced inside the
editing UI, in Hebrew, before save — otherwise the doctor writes a prohibited
phrase, the build fails silently, and the site stops updating with no
explanation. Hours and photographs cannot fail the claims linter, so that
entire problem is out of scope.

### Reviews are out of scope permanently

The owner asked for review uploading. It cannot be built.

תקנות רופאי השיניים (פרסומת אסורה), תשס"ט-2009 prohibits a dentist advertising
using a patient's name, image, likeness or identifying information — reportedly
even with consent. Violation is criminal and outsourcing does not shift
liability. See ADR 0005.

A panel whose purpose is publishing patient testimonials is a tool for
producing prohibited advertising. What the owner gets instead is the **Google
rating aggregate** — `clinic.googleRating.value` and `.count`, two numbers
copied from the live profile. That is Google's published statistic about the
business, not a patient's words, and the component already exists.

---

## 2. Architecture

A second Cloudflare Worker, separate from the appointment-email relay.

```
Doctor
  │  email + one-time code
  ▼
Cloudflare Access ──────────────── rejects everyone else
  │
  ▼
Worker: admin.drkhalilkanani.com
  │  validates everything server-side
  ▼
GitHub Contents API  ── ordinary commit to main
  │
  ▼
Deploy workflow: claims linter · mixed-script linter · asset guard
                 a11y audit · 118 unit tests · production build
  │
  ▼
GitHub Pages ── live in roughly 2–4 minutes
```

### JSON-backed mutable content

The Worker never edits TypeScript. The two mutable datasets are extracted into
JSON files that the TypeScript imports:

```
src/data/hours.json                  ← CMS-writable
src/data/clinic-photography.json     ← CMS-writable
src/data/media.ts  (treatmentWork)   ← NOT writable, stays inline in TS
```

A file containing nothing but hours has no adjacent content to corrupt, so the
Worker does `JSON.parse` → validate → `JSON.stringify`. No regex, no AST
tooling, no new dependency.

**This is also how `treatmentWork` is protected.** The CMS is *structurally
incapable* of touching treatment or patient work, because those entries do not
live in any file on the Worker's path allow-list — not because a validation
rule says so. Validation is the third line of defence here, not the first.

### Why git-backed rather than a runtime store

A runtime store (KV, D1) would publish instantly, and the owner did ask for
"a minute or two". It was rejected because content would leave the repository,
and **every safeguard on this site runs at build time**: the claims linter, the
mixed-script linter, the asset guard, the launch gate. Moving content out
turns all of them off.

It would also bypass Astro's build-time image pipeline, so photographs would be
served at full size rather than as generated WebP/AVIF derivatives.

The cost is honest: **changes take 2–4 minutes, not seconds.** For opening
hours and gallery photographs, neither of which is an emergency, that is the
right trade.

### Why not Keystatic

ADR 0004 named Keystatic as the likely path. Rejected on inspection:

- It authenticates through GitHub, so the doctor would need a GitHub account
  and an understanding of repositories. That is the wall this panel exists to
  remove.
- It is built for markdown collections. Hours live in a TypeScript object in
  `src/data/clinic.ts`. Using Keystatic would mean restructuring that file to
  suit the tool rather than the project.
- He would meet a general-purpose CMS interface when he needs two forms.

---

## 3. Screens

Hebrew-first, RTL, large touch targets. He will use this on a phone between
patients.

### 3.1 Hours

Seven rows, one per day, labelled in Hebrew. Each row:

| Control | Behaviour |
|---|---|
| Day | Label only |
| סגור (closed) | Toggle. When on, the time fields disable |
| פתיחה / סגירה | Time inputs, pre-filled from what is live |

One Save button. Validation: a day that is not closed must have both times, and
opening must precede closing.

Hours are stored in `src/data/hours.json` and replaced wholesale on save, so a
partial write cannot leave a half-edited week.

**The verification state is derived, not synchronised.** An earlier draft had
the Worker also updating `VERIFICATION.hours.published`. That was wrong: it
creates two mutable sources of truth that can drift. `hasHours()` is already
content-driven, so the manifest entry is derived from it:

```ts
get published() { return hasHours(); },
```

One authoritative value. The Worker writes exactly one file, and the drift the
manifest exists to prevent becomes impossible rather than merely handled.

### 3.2 Photos

A grid of published photographs, each with **הסרה** (remove).

Adding one:

| Field | Notes |
|---|---|
| File | Image picker |
| Category | Dropdown of `ClinicPhotographyCategory` |
| תיאור (Hebrew) | Short description of what is shown |
| وصف (Arabic) | Same, in Arabic |
| Confirmation | **Required checkbox**, see below |

English alt text is filled with the Arabic value and flagged internally for
review. The owner is a native speaker of Hebrew and Arabic — the two locales
most patients use — so two short phrases is not real work. English is the
least-used locale and gets a placeholder rather than blocking the upload.

**The filename is generated**, never typed: `<category>-<nn>.jpg`, following
`docs/ASSETS.md`.

### Photo lifecycle — three states, not deletion

Removal is not destruction. A photograph moves between:

| State | Public gallery | Available actions |
|---|---|---|
| **מפורסם** (published) | Rendered | Unpublish |
| **מוסתר** (unpublished) | Hidden; metadata and file retained | Publish · Delete permanently |
| **Deleted** | Gone | — |

**Unpublish is the normal removal action.** It hides the photograph from the
public gallery on the next deployment while keeping the original file and all
its metadata, so it can be published again later unchanged.

**Zero published photographs is a valid state.** Unpublishing the last one is
allowed; the gallery section already hides itself when empty. Nothing forces a
minimum.

**Permanent deletion** removes the record and the current image file in one
ordinary, auditable commit. It is visually separated from the normal actions
and requires a confirmation naming the specific photograph.

It **current-tree only**. It does not rewrite git history, force-push, purge
historical objects or change repository visibility. Historical git objects are
outside the CMS's responsibility — see
[`GIT-HISTORY-REMEDIATION.md`](../GIT-HISTORY-REMEDIATION.md), which closed
history rewriting as not worth its risk.

---

## 4. The parts that need care

### 4.1 Build feedback — the feature that decides whether this is trusted

If CI fails, the site silently does not update. Without feedback the doctor
changes his hours, sees nothing happen, and stops using the panel.

After saving, the panel polls the GitHub Actions API for the commit's run and
shows one of three states in Hebrew:

- **מתפרסם…** — running
- **פורסם** — deployed, with the time
- **נכשל** — failed, classified per below. The raw log is never shown.

#### Content failure versus technical failure

A failed deployment has two very different meanings, and conflating them either
blames the doctor for an infrastructure problem or hides a real content
mistake.

| Classification | Determined by | Message |
|---|---|---|
| **Content** | A *known* job whose failure can only mean rejected content: `lint:claims`, `lint:scripts`, `lint:assets`, plus server-side validation refusals | Names exactly what to change |
| **Technical** | Everything else — build, `test:e2e`, `lint:a11y`, infrastructure, **and anything unrecognised** | "הפרסום נכשל מסיבה טכנית. זו לא בעיה בתוכן שלכם." plus a developer-support path |

**Unknown failures default to technical.** A unit-test failure is *not*
automatically a content failure — most unit tests have nothing to do with his
input. Classification is driven by an explicit list of known jobs and known
validation types; anything outside it is treated as the project's problem, not
his.

#### A failed publication never claims success

GitHub Pages continues serving the **previous successful deployment** when a
build fails, so the live site is never broken by a rejected change. The admin
UI must reflect that precisely: on failure it states that the change is **not**
live and the previous version is still showing. It must never imply new content
is published when it is not.

### 4.2 The patient-photograph confirmation

Every upload requires ticking:

> אני מאשר/ת: בתמונה אין מטופל, אין חלק מגוף של מטופל, ואין השוואת לפני/אחרי.

Save stays disabled until it is ticked. **No software can detect a patient in a
photograph.** This is the same control as `docs/ASSETS.md`'s "open every image
before you commit it", moved to the point of upload — and this project has
already had thirteen patient photographs committed unreviewed.

The confirmation is recorded in the commit message, so the record of who
confirmed what survives in history.

### 4.3 The asset guard must not weaken

`scripts/check-assets.mjs` blocks any image committed without being registered.
It currently finds registrations by reading `src/data/media.ts` from the git
index. Moving clinic photographs into JSON would silently take them outside
that check — the guard would keep passing while covering less.

**That is the single most dangerous side effect of this migration**, because
the guard exists precisely because thirteen patient photographs were once
committed unreviewed.

After migration the guard must understand **both** sources:

- the developer-managed manifest (`src/data/media.ts` — `treatmentWork`,
  `illustrations`)
- the CMS-managed `src/data/clinic-photography.json`

Regression tests are an explicit acceptance criterion of the migration, not a
follow-up. See the implementation plan, Phase 1.

### 4.4 Concurrent edits

If the doctor saves while a developer is working in the repository, the commit
could clobber. The GitHub Contents API requires the current file SHA; the
Worker fetches it immediately before committing, and on a 409 retries once
with a fresh SHA. A second conflict surfaces as "try again in a moment"
rather than silently overwriting.

### 4.5 Image validation

Checked in the browser for a fast message, and **again in the Worker**, which
is the control:

- Type: JPEG or PNG only, verified by magic bytes rather than the extension
- Size: 8 MB maximum
- Dimensions: minimum 1200px on the long edge, per `docs/ASSETS.md`

---

## 5. Security

The owner asked for this to be handled carefully. The threat model is: a
stranger reaching the panel, or a compromised panel being used to publish
arbitrary content to a medical website.

| Control | Detail |
|---|---|
| **Authentication** | Cloudflare Access, email one-time code. Allow-list of two identities: the doctor as primary, the developer as fallback. No password to leak or reuse. |
| **Fail-closed allow-list** | `ALLOWED_EMAILS` is configuration, never code, and ships **empty**. An unconfigured Worker refuses every request rather than admitting anyone. Both addresses are `NEEDS OWNER CONFIGURATION` and must not be invented, guessed or hardcoded. |
| **Authorisation** | The Worker re-checks the `Cf-Access-Jwt-Assertion` header and verifies the JWT against Cloudflare's public keys. Access sitting in front is not treated as sufficient on its own. |
| **GitHub credential** | Fine-grained PAT: one repository, `contents: write` only. No workflow, packages, or account scope. Stored via `wrangler secret put`, never committed. |
| **Secret exposure** | Nothing secret reaches the browser. The panel never sees the GitHub token; all writes are server-side. |
| **Input validation** | Every field re-validated in the Worker. Category must be a known enum member. Filenames are generated, never accepted from the client — no path traversal surface. |
| **Commit scope** | The Worker may only write `src/data/hours.json`, `src/data/clinic-photography.json` and files under `src/assets/images/`. Any other path is refused. `src/data/media.ts` is deliberately absent, which is what makes `treatmentWork` unreachable. |
| **Rate limiting** | Cloudflare WAF rule on the admin hostname, as with the email relay. |
| **Audit trail** | Every change is a git commit with the authenticated email in the message. Cloudflare Access keeps its own access log. |
| **Blast radius** | A compromised token can commit to this repository only. It cannot deploy, cannot read secrets, cannot touch DNS or other repositories. |

Two things deliberately **not** relied upon:

- **CORS.** The panel is same-origin; CORS is not an access control.
- **Obscurity of the hostname.** `admin.` will be discovered. Access is the
  control.

### What a successful compromise could still do

Honestly stated: publish photographs and change opening hours on the website.
It could not read patient data (none is stored), send email as the clinic (a
different Worker with a different secret), or alter DNS. The build gates would
still reject prohibited claims. That is a small blast radius, but not zero, and
it is why the credential is scoped as tightly as it is.

---

## 6. Testing

| Layer | Covers |
|---|---|
| Unit | Manifest mutation, filename generation, hours validation, verification-manifest update |
| Worker | Rejects unauthenticated requests; rejects an invalid JWT; rejects unknown categories; refuses writes outside the allowed paths; correct GitHub calls with the API stubbed |
| Security | No secret in served HTML; client-supplied filename or path is ignored; oversized and wrong-type uploads rejected |
| E2E | Both screens render, validation blocks an incomplete save, the confirmation gates the upload |

---

## 7. Out of scope

- Patient reviews — prohibited
- Treatment text, FAQ, bio — Approach 3, deferred
- Appointment-request tracking (CRM) — separate product, separate decision
- Instant publishing

---

## 8. Open questions for the owner

1. **Which email address** should Cloudflare Access allow? Presumably the
   doctor's, and possibly the developer's as a fallback.
2. **Should removing a photograph delete the file**, or keep it in the
   repository and only unpublish it? Deleting is cleaner; keeping allows undo.
3. **English alt text** is currently a placeholder copied from Arabic. Accept,
   or add a periodic review task?

---

# UI design

Informed by the `ui-ux-pro-max` guideline set (async status, error summaries,
compact-control semantics, destructive-action confirmation, loading buttons).

## 9. The governing decision: it is the same website

The panel uses `src/styles/global.css` **verbatim** — the same tokens, type
scale, radii, easing and surfaces as the public site. No new palette, no
second design language.

This is the single biggest thing separating a professional tool from one that
looks generated. Admin panels drift into a default aesthetic — indigo accents,
oversized radii, gradient headers, stat cards nobody reads — because they are
designed in isolation from the product. The doctor should open this and
recognise his own website.

Concretely, it inherits:

| | |
|---|---|
| Surfaces | porcelain → mist → haze → tide |
| Depth | **layered tint and hairlines, never a drop shadow** |
| Accent | one saturated `--color-ink` `#0C5283` |
| `--color-signal` `#2195D2` | icons and graphics only — 3.34:1, fails for text |
| Radii | `--radius-card` 14px · `--radius-btn` 12px · `--radius-field` 10px |
| Motion | `--ease-out`, `--dur-fast/base`, honouring `prefers-reduced-motion` |
| Direction | logical properties only |

### What it deliberately does not have

No dashboard home. No statistics tiles. No charts. No sidebar. The panel has
two jobs; a navigation chrome built for twenty would be decoration pretending
to be product.

## 10. Structure

Phone-first, single column, `--shell-max` capped at a comfortable reading
width on desktop. He will use this standing up, between patients.

```
┌─────────────────────────────────┐
│  ד״ר חליל כנעאני · ניהול        │  ← thin bar, name + sign out
├─────────────────────────────────┤
│  [ שעות פתיחה ]  [ תמונות ]     │  ← two tabs, nothing more
├─────────────────────────────────┤
│                                 │
│  (screen)                       │
│                                 │
├─────────────────────────────────┤
│  publish status                 │  ← appears only after a save
└─────────────────────────────────┘
```

Two tabs, not a menu. With two destinations a menu is a worse menu.

## 11. Screen: hours

A **list, not cards**. Seven rows of the same shape read as one table the eye
can scan; seven cards read as seven unrelated objects.

```
┌─────────────────────────────────────────────┐
│ ראשון            [ סגור ○ ]                 │
│ ┌──────────┐  ┌──────────┐                  │
│ │  09:00   │  │  18:00   │                  │
│ └──────────┘  └──────────┘                  │
├─────────────────────────────────────────────┤
│ שני              [ סגור ○ ]                 │
│ …                                           │
├─────────────────────────────────────────────┤
│ שבת              [ סגור ● ]                 │
│         — סגור —                            │
└─────────────────────────────────────────────┘
```

- Rows separated by a hairline `--color-line`, not gaps. One object.
- The closed toggle is a **native checkbox**, restyled — not a `<div>` with a
  click handler. It carries a real label, a real `checked` state and native
  keyboard behaviour.
- Closed state is shown by **text as well as position** — "— סגור —" replaces
  the time fields. State is never conveyed by colour or position alone.
- Time fields are `<input type="time">`: the phone gives a native time wheel,
  which beats anything custom for a one-handed user.
- Fields are `min-height: 48px`, above the 44px floor.

**Save** is a single full-width button at the end of the list, `--color-ink`.
It is not sticky — the list is seven rows and fits a phone screen, so a sticky
bar would cover content to solve a problem that does not exist here.

### Validation

Reuses the appointment form's pattern exactly, because it is already built and
already correct: a focusable error summary at the top with `role="alert"` and
`tabindex="-1"`, each item linking to its field, **plus** inline errors bound
with `aria-describedby`. Inline errors are never replaced by the summary.

Rules: a day that is not closed needs both times; opening must precede closing.

## 12. Screen: photos

### The grid

Published photographs as a two-column grid on a phone, three on desktop, each
at its true aspect ratio. Remove is a labelled icon button in the corner of
each tile — `aria-label` naming *which* photo, never a bare "remove".

### Adding one — a separate focused step, not an inline form

Pressing **הוספת תמונה** opens a full-screen step. Cramming a file picker,
two text fields and a legal confirmation into a corner of the grid produces
the cramped, generated look the owner asked to avoid; more importantly the
confirmation deserves the screen's full attention.

Order matters, and it is: **pick → see → describe → confirm → save.**

```
1  [ בחירת תמונה ]
2  ┌───────────────────┐
   │   preview         │   ← he sees it BEFORE describing it
   └───────────────────┘
3  קטגוריה   [ קבלה ▾ ]
4  תיאור בעברית   [__________]
5  وصف بالعربية   [__________]
6  ┌───────────────────────────────┐
   │ ☐  אני מאשר/ת: בתמונה אין      │
   │    מטופל, אין חלק מגוף של      │
   │    מטופל, ואין השוואת          │
   │    לפני/אחרי.                  │
   └───────────────────────────────┘
7  [      שמירה      ]   ← disabled until 6 is ticked
```

The preview comes before the description fields for a reason: he cannot write
alt text for a photograph he has not looked at, and looking at it is also the
moment he would notice a patient in the frame.

### The confirmation

Given its own bordered block, not a line of small print beside a checkbox. It
is the only element on the page allowed to interrupt the visual rhythm —
because it is the only control standing between this panel and the mistake
this project has already made once.

Save stays `disabled` until it is ticked, and the disabled state is explained
in text beneath the button rather than left for him to work out.

### Removing — two different actions

**הסתרה (unpublish)** is the normal action and sits with the other controls. It
takes effect on the next successful deployment; the file and metadata are kept
so it can be published again unchanged. No confirmation dialog — it is
reversible in one tap.

**מחיקה לצמיתות (delete permanently)** appears only on already-unpublished
photographs, and is placed apart from the normal controls. It uses
`--color-danger` as text on the ordinary surface, **not** a red-filled button:
loud styling on a rare action trains people to dismiss it.

It opens the site's standard native `<dialog>`, naming the specific
photograph — focus trap, Escape and focus restore all come from the browser.
Deliberately not a dramatic modal; the design system already has the right
component.

A photograph can never be permanently deleted in one click from the published
state: it must be unpublished first, which is itself the pause that prevents
the accident.

## 13. Publish status — the component that earns its keep

Changes take 2–4 minutes. Without this he changes his hours, sees nothing, and
concludes the tool is broken.

A single region below the screen, present only after a save:

| State | Shows |
|---|---|
| Publishing | Animated hairline + **מתפרסם… זה לוקח כ־2–3 דקות** |
| Published | Check in `--color-ink` + **פורסם באתר** + the time |
| Failed | Alert icon + plain-language reason + "צרו קשר עם המפתח" |

Marked up as `role="status"` with `aria-atomic="true"`, announcing a full
sentence rather than a bare word, and **never moving focus** — he may have
moved on to the next screen. The failed state uses `role="alert"`.

Success is not a toast. A toast disappears; a man who pockets his phone
mid-publish should be able to pull it out and still see what happened.

Under `prefers-reduced-motion` the animated hairline becomes static.

## 14. Typography and language

Hebrew first, `dir="rtl"`, with the site's own Hebrew face. Arabic fields are
individually `dir="rtl"` with the Arabic face; times and numbers are wrapped
in `.u-ltr` so they never reorder.

Body text at `--text-base` (17px) rather than the 14px common in admin tools.
This is one person on a phone, occasionally in a hurry, possibly without
reading glasses. There is no information density problem to solve.

## 15. Accessibility

Bound by IS 5568 — WCAG 2.0 AA, with **2.4.10 Section Headings mandatory at
AA**, so each screen carries a real `<h1>` and correctly nested headings. The
existing `scripts/audit-html.mjs` gate is extended to cover the panel's
rendered output.

- Every control reachable and operable by keyboard, with the site's 3px
  `:focus-visible` ring at 2px offset
- No state by colour alone — closed days, confirmation, and each publish state
  all carry text
- Touch targets ≥48px with ≥8px separation
- Every icon button carries an `aria-label` naming its specific object
