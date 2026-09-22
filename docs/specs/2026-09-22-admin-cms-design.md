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

**On save the verification manifest is updated too.** `VERIFICATION.hours` is
currently `published: false`, which is accurate only while hours are empty —
`hasHours()` renders them as soon as they are filled. Leaving the entry
unchanged would make the manifest claim hours are hidden while they are on
screen, which is exactly the drift the manifest exists to prevent.

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

**Removal** deletes the manifest entry and the image file in one commit.

---

## 4. The parts that need care

### 4.1 Build feedback — the feature that decides whether this is trusted

If CI fails, the site silently does not update. Without feedback the doctor
changes his hours, sees nothing happen, and stops using the panel.

After saving, the panel polls the GitHub Actions API for the commit's run and
shows one of three states in Hebrew:

- **מתפרסם…** — running
- **פורסם** — deployed, with the time
- **נכשל** — failed, with a plain-language reason and a "tell the developer"
  prompt. The raw log is never shown; it would be noise to him.

### 4.2 The patient-photograph confirmation

Every upload requires ticking:

> אני מאשר/ת: בתמונה אין מטופל, אין חלק מגוף של מטופל, ואין השוואת לפני/אחרי.

Save stays disabled until it is ticked. **No software can detect a patient in a
photograph.** This is the same control as `docs/ASSETS.md`'s "open every image
before you commit it", moved to the point of upload — and this project has
already had thirteen patient photographs committed unreviewed.

The confirmation is recorded in the commit message, so the record of who
confirmed what survives in history.

### 4.3 Concurrent edits

If the doctor saves while a developer is working in the repository, the commit
could clobber. The GitHub Contents API requires the current file SHA; the
Worker fetches it immediately before committing, and on a 409 retries once
with a fresh SHA. A second conflict surfaces as "try again in a moment"
rather than silently overwriting.

### 4.4 Image validation

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
| **Authentication** | Cloudflare Access, email one-time code, allow-list of one address. No password to leak or reuse. |
| **Authorisation** | The Worker re-checks the `Cf-Access-Jwt-Assertion` header and verifies the JWT against Cloudflare's public keys. Access sitting in front is not treated as sufficient on its own. |
| **GitHub credential** | Fine-grained PAT: one repository, `contents: write` only. No workflow, packages, or account scope. Stored via `wrangler secret put`, never committed. |
| **Secret exposure** | Nothing secret reaches the browser. The panel never sees the GitHub token; all writes are server-side. |
| **Input validation** | Every field re-validated in the Worker. Category must be a known enum member. Filenames are generated, never accepted from the client — no path traversal surface. |
| **Commit scope** | The Worker may only write `src/data/clinic.ts`, `src/data/media.ts` and files under `src/assets/images/`. Any other path is refused. |
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
