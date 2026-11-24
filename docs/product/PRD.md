# PRD — Dr. Khalil Kanani dental clinic website

**Product Requirements Document.** What the website is, who it serves, what it
must and must not do, and how it is built. It ranks above every other project
document except Israeli law. Engineering rules are in `AGENTS.md`; current
state is in `HANDOFF.md` and `BUILD-STATE.md`.

**Status:** live at https://www.drkhalilkanani.com · **Owner:** the clinic ·
**Last reviewed:** 2026-11-24 (replaces the former REQUIREMENTS doc; its rules are
carried over unchanged in §4–§5).

---

## 1. Overview

A trilingual website (Hebrew, Arabic, English) for one dental clinic in
Jadeidi-Makr, Northern District, Israel. Before it, the clinic had no
meaningful web presence. The site is the clinic's **acquisition channel**: it
turns local searches into phone calls, WhatsApp messages and appointment
requests.

It optimises for, in this order: **trust, clarity, easy contact, local
discoverability.**

## 2. Goals and success metrics

| Goal | Metric | Baseline | Target |
|---|---|---|---|
| Patients contact the clinic | appointment requests + calls + WhatsApp per month | not counted yet | **OPEN — owner sets the 3-month number** |
| Patients find the clinic | Search Console clicks; Business Profile calls and direction requests | 5 clicks / 38 impressions (3 months to 2026-09-28) | OPEN |
| Fast on mobile | Lighthouse mobile performance on `/he/` `/ar/` `/en/` | 97 / 100 / 100 (2026-11-24) | ≥ 90 every day |
| Always up and correct | scheduled smoke checks passing | starts 2026-11-24 | 99.5 % per 28 days |

The site sets no cookies and runs no analytics (a privacy decision), so
contact counts come from the clinic inbox, the Business Profile and Search
Console, not from tracking.

## 3. Users

| Who | Needs | Context |
|---|---|---|
| Local patients and families | find a dentist nearby, trust the doctor, contact quickly | on a phone, often on mobile data; Hebrew or Arabic first |
| Arabic-speaking community of the clinic's own town | the same, in their language, never a lesser copy | Arabic is co-equal with Hebrew, not a translation |
| English speakers (visitors, family abroad, olim) | basic information and contact | lower volume |
| Patients in pain after hours | a way to ask for an appointment when the clinic is closed | the request form |
| **The doctor (editor)** | update text, hours, treatments, FAQ and photos without a developer | Edit Mode at `admin.drkhalilkanani.com` |

## 4. Requirements

### Must

1. Trilingual he / ar / en with correct RTL and LTR.
2. Present the doctor and the clinic's treatments factually.
3. Make contacting the clinic trivially easy on a phone.
4. Accept appointment **requests**, not real-time booking.
5. Conform to WCAG 2.1 AA (IS 5568 baseline is 2.0 AA).
6. Comply with Israeli dental advertising regulations.
7. Comply with the Protection of Privacy Law as amended (Amendment 13).
8. Be fast on mobile over Israeli mobile networks.
9. Be maintainable by one developer.

### Must not

- Publish any unverified fact about the doctor or clinic.
- Publish testimonials, patient photographs, prices or promotions. The
  owner's explicit instruction permits the selected Instagram work photos in
  ADR 0009 / 0010 as a scoped exception; it does not assert legal clearance.
- Use manipulative urgency.
- Claim an unrecognised specialty.
- Auto-redirect visitors by IP or browser language.

### Non-functional

| Area | Requirement | Enforced by |
|---|---|---|
| Performance | mobile Lighthouse perf ≥ 90, LCP ≤ 2.5 s, CLS ≤ 0.1; near-zero JavaScript | daily `scheduled-check.yml` |
| Accessibility | WCAG 2.1 AA; no heading-level skips; works with a screen reader | axe in Playwright, `lint:a11y` on built HTML (blocks deploy) |
| Legal content | no prohibited claims; no unverified facts | `lint:claims`, the launch gate in `npm run build` |
| Scripts | no Cyrillic/Greek look-alike letters in he/ar text | `lint:scripts` |
| Media | every image opened, registered and alt-texted in 3 languages | `lint:assets`, pre-commit hook |
| SEO | one canonical per page, hreflang clusters, sitemap, valid JSON-LD | `lint:seo` crawl (blocks deploy) |
| Privacy | store nothing on the site; name every processor in the policy | `docs/legal-security/PRIVACY.md` |
| Mobile UI | built for 375 px; no horizontal scroll at 320 px; 44×44 px tap targets | constitution, Playwright |

## 5. Scope

### Pages (each in `/he/`, `/ar/`, `/en/`)

| Page | Purpose |
|---|---|
| Home | hero, trust strip, treatments, doctor, gallery, FAQ, find-the-clinic, contact |
| Treatments + 8 treatment pages | emergency dental, implants, clear aligners, whitening, veneers, root canal, extraction, fillings |
| About | the doctor and the clinic, clinic photography |
| Contact | phone, WhatsApp, appointment request form, map and directions |
| FAQ | general questions |
| Accessibility statement | required in Israel |
| Privacy · Terms · Cookies | legal pages, with the clinic's business details |
| 404 | in all three languages |

`/` serves the Hebrew home (canonical `/he/`). Slugs are English in every
language so shared links stay readable in WhatsApp.

### Features

- **Contact on every page:** a sticky mobile bar (call · WhatsApp) that never
  covers footer content.
- **Appointment request form:** name, phone, preferred contact method, and
  optionally treatment of interest, daypart and a note. Non-clinical labels
  only, so an enquiry does not become sensitive medical data.
- **Find the clinic:** address, Waze and Google Maps links; the map loads only
  on click (no third-party request until the visitor asks).
- **Language switcher:** goes to the same page in the other language.
- **Accessibility control:** text size and contrast preferences, stored only
  in the visitor's browser.
- **Edit Mode (CMS):** the doctor edits the real pages; see §7.

### Out of scope

Real-time scheduling · patient portal · payments · prices · blog · reviews and
testimonials · before/after gallery. Reviews and before/after are
**prohibited**, not deferred (ADR 0005, 0006). Later ideas live in
`planning/ROADMAP.md`.

## 6. Key flows

**Call or WhatsApp (primary).** Any page → sticky bar or contact section →
`tel:` link or WhatsApp chat with a pre-filled greeting.

**Appointment request (after hours).**
1. The visitor fills the form; the browser validates the phone number.
2. The form POSTs to the appointment relay (Cloudflare Worker), which accepts
   only the site's own origin, drops honeypot submissions and validates name
   and phone on the server.
3. The relay sends the request through Resend to the clinic inbox. The site
   stores nothing.
4. If the relay cannot be reached, the form falls back to a WhatsApp message
   the visitor reviews and sends. A request is never silently dropped.

**The doctor edits content.**
1. Signs in at `admin.drkhalilkanani.com` (Cloudflare Access).
2. Sees the real site with pencils beside editable content; edits in place.
3. The admin Worker commits the change to `main` on GitHub.
4. `deploy.yml` runs every gate and publishes it (~5 minutes). Edit Mode shows
   "Live" only when `/build.txt` on the public site carries that commit.

## 7. How it is built

### Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Astro 7 (static output, no adapter) | a content site; ships almost no JavaScript (ADR 0001) |
| Styling | Tailwind 4, logical properties only | correct RTL without a plugin |
| Content | JSON data files validated by Zod + typed TS modules | one schema, three locales; a missing translation fails the build |
| Motion | `motion` (vanilla) | small; no React |
| Fonts | Noto Sans Hebrew / Arabic / Latin, self-hosted and subset | no external font requests |
| Images | `sharp` at build time | responsive, optimised images |
| Hosting | GitHub Pages, `www.drkhalilkanani.com` | what is built is what is served |
| Admin / Edit Mode | Cloudflare Worker + Cloudflare Access | sign-in, then commits through the GitHub API |
| Appointment relay | Cloudflare Worker + Resend | the only piece that sends mail |

### Architecture

```
 visitor ──► GitHub Pages (static HTML/CSS, tiny JS) ── www.drkhalilkanani.com
     │
     └─ form POST ─► relay Worker ─► Resend ─► clinic inbox
                      (fallback: WhatsApp message the visitor sends)

 doctor ──► Cloudflare Access ─► admin Worker (Edit Mode = same pages + pencils)
                                      │ commit via GitHub API
                                      ▼
                       GitHub main ─► deploy.yml (all gates) ─► GitHub Pages
```

### Where things live

| Path | What |
|---|---|
| `src/pages/[locale]/` | page routes |
| `src/components/sections/` | page sections (Hero, TreatmentsGrid, DoctorIntro, FindTheClinic, StickyActionBar, …) |
| `src/data/*.json` | CMS-editable content: copy, doctor, services, FAQ, hours, contact facts, photos |
| `src/data/clinic.ts` | the single source of truth for name, address and phone (NAP) |
| `src/i18n/` | routing, direction and UI strings |
| `src/lib/` | SEO, JSON-LD, validation, image helpers |
| `workers/admin/` · `workers/appointment-email/` | the two Workers |
| `scripts/` | linters, audits, ops checks |
| `tests/unit/` · `tests/e2e/` | Node test runner · Playwright + axe |

### Two builds, one codebase

`npm run build` makes the public site (`dist/`). `npm run build:admin` makes
the same pages with Edit Mode on, for the admin Worker.
`npm run verify:same-site` proves the two match once the editor is stripped.

### Delivery pipeline

| When | Workflow | What runs |
|---|---|---|
| Every pull request | `preview.yml` | data, claims, scripts, assets, type check, unit tests · secret scan + dependency audit · preview build |
| Every push to `main` (merge or Edit Mode save) | `deploy.yml` | the same gates + strict build, accessibility audit, SEO crawl, Playwright in two shards → publish → IndexNow |
| Every 30 min / daily / weekly | `scheduled-check.yml` | read-only smoke, Lighthouse budget, secret scan + audit; opens an issue on failure |

`main` is production (ADR 0012). Rollback is a `git revert`.

### Run it locally

```bash
npm install
npm run dev            # http://localhost:4321 — no env vars or secrets needed
npm test               # unit tests
npm run verify         # linters + type check
```

## 8. Definition of done (per change)

- Rules in `AGENTS.md` §3 hold: no invented fact, no medical claim, media
  reviewed and registered.
- Works in `/he/`, `/ar/`, `/en/` at 375 px and desktop; axe clean; no heading
  skips.
- Tests added or updated; CI green on the pull request.
- `HANDOFF.md` updated; `BUILD-STATE.md` backlog ticked.

## 9. Open questions

| Question | Who decides |
|---|---|
| The 3-month goal number (North Star) | owner |
| Monthly budget ceiling | owner |
| Enquiry retention period; which mailbox `MAIL_TO` is | owner + lawyer |
| Legal review of the policies and of the published treatment-work photos | lawyer |
| Opening hours (currently unconfirmed and hidden) | owner |

## 10. Related documents

`docs/README.md` (index) · `engineering/ARCHITECTURE.md` · `engineering/VISUAL-CMS.md` ·
`engineering/I18N.md` · `design/DESIGN_SYSTEM.md` · `legal-security/PRIVACY.md` ·
`seo/SEO.md` · `decisions/` · `planning/ROADMAP.md`
