# AGENTS.md — engineering rules for this repository

Universal instructions for any coding agent or developer working here.
Read this before touching anything.

> **Note:** Astro's scaffolder ships `CLAUDE.md` as a *symlink* to this file.
> That symlink has been removed — both are real files now. Do not recreate it,
> or writing one will silently destroy the other.

---

## 1. What this project is

A trilingual (Hebrew / Arabic / English) website for **Dr. Khalil Kanani**, a
solo dental clinic in **Jadeidi-Makr**, Northern District, Israel.

The clinic has essentially no other web presence. This site *is* the acquisition
channel, so local discoverability and one-tap contact outrank everything else.

---

## 2. Source-of-truth hierarchy

When two sources disagree, the higher one wins.

1. Israeli law (advertising, accessibility, privacy) — see §3, §6, §7
2. `docs/REQUIREMENTS.md`
3. `docs/decisions/` (ADRs)
4. This file
5. `docs/` (the rest)
6. Code
7. Chat history — **never authoritative**

---

## 3. The two non-negotiables

### 3.1 Never invent a fact about a real person or clinic

`src/data/clinic.ts` and `src/data/doctor.ts` carry real, verifiable data only.
Anything unconfirmed is marked in the `VERIFICATION` manifest and **the build
refuses to run in production** until it is resolved.

Never populate a credential, address, opening hour, price or qualification that
has not been confirmed in writing by the owner. `doctor.credentials` is empty
on purpose — discovery found no verifiable qualifications in any public source.

### 3.2 Never commit media you have not opened

**`git add -A` is banned for anything that could include media.** Stage files
by path, or run `npm run lint:assets` first.

Every image must be registered in `src/data/media.ts` with a category and alt
text in three languages before it can be committed. A pre-commit hook
(`.githooks/pre-commit`) enforces this and CI re-checks it.

No image containing a patient, any part of a patient, or a before/after
comparison may ever be registered — not with consent, not cropped, not
anonymised. Move such files to `.private-assets/` (gitignored).

**Scoped owner instruction, 2026-09-21:** the owner subsequently explicitly
directed publication of three selected clinic Instagram work posts after this
restriction was explained. Those exact assets are documented in
`docs/decisions/0009-owner-directed-instagram-gallery.md` and supersede the
blanket project exclusion above for that selection only. Do not remove them
as unreviewed material. This records the owner's publishing direction, not
verified patient consent or a legal clearance. All other media still follow
the default rule; the asset guard and explicit staging remain mandatory.

This rule exists because thirteen patient before/after images reached the
public repository in a single unreviewed `git add -A`. The guard cannot
recognise a patient photograph; it makes skipping the look impossible.
See docs/ASSETS.md.

### 3.3 Never introduce a prohibited medical claim

Israeli law (**תקנות רופאי השיניים (פרסומת אסורה), תשס"ט-2009**) makes it a
**criminal** matter for a dentist to advertise:

| Prohibited | Notes |
|---|---|
| Guaranteed treatment success | No "אחריות", "מובטח", "guaranteed" |
| Patient names, images, likeness or identifying information | Reportedly **even with consent** |
| Before/after patient photography | Same basis |
| Prices, tariffs, discounts, promotions, gifts | Free treatment is a narrow carve-out — counsel first |
| Praise of the dentist's skill or knowledge | No "the best", "leading" |
| Unrecognised specialist titles | **Implantology is NOT a recognised Israeli specialty.** Write "performs implants", never "מומחה להשתלות" |
| Success statistics without MoH approval | No "95% success" |

Outsourcing does not shift responsibility — the dentist remains liable even
when an agency or an agent wrote the copy.

`npm run lint:claims` encodes these as a mechanical check. It is a safety net,
**not legal advice**, and does not replace review by an Israeli lawyer.

---

## 4. Quality gates

Run before declaring anything done:

```bash
npm run verify      # claims linter + mixed-script linter + astro check
npm run build       # includes the launch gate and locale-parity gate
```

| Gate | What it blocks | Where |
|---|---|---|
| **Launch gate** | Production build while any clinic fact is unverified | `src/lib/verify.ts`, wired in `astro.config.mjs` |
| **Locale parity** | A treatment existing in one language but not all three | `src/lib/verify.ts` via `src/lib/content.ts` |
| **Claims linter** | Prohibited advertising patterns in he/ar/en | `scripts/lint-claims.mjs` |
| **Mixed-script linter** | Cyrillic/Greek homoglyphs inside Hebrew or Arabic text | `scripts/lint-mixed-scripts.mjs` |
| **Asset guard** | Committing an image nobody has opened and classified | `scripts/check-assets.mjs` + `.githooks/pre-commit` |
| **Accessibility audit** | Heading skips, duplicate ids, missing alt, unnamed controls, wrong `lang`/`dir` — in the **built** HTML | `scripts/audit-html.mjs`, `npm run lint:a11y` |
| **Unit tests** | Regressions in config, locales, contact URLs, gating | `npm test` |

Heading order is not a style preference here. IS 5568 promotes WCAG 2.4.10
Section Headings to **mandatory at AA** in Israel, where WCAG itself treats it
as AAA — so a skipped level is a conformance failure. The audit runs against
`dist/` because a component can be correct and still emit a duplicate id once
it renders three times on one page. It runs in both workflows and blocks the
deploy.

**`VERIFY_RELAX=1` is preview-only.** It disables the gate entirely and must
never touch production — it did once, and the live site shipped unverified data
for days while the gate appeared to be protecting it.

Production uses **`ACK_UNVERIFIED`** instead: a comma-separated allowlist of
the exact fields knowingly shipped unverified. A blanket bypass absorbs
whatever placeholder appears next; an allowlist fails the moment an
unacknowledged field shows up. The set can only shrink or be consciously
extended.

The gate also distinguishes *published* from *hidden* facts. An unverified
address is guarded by `hasAddress()` and never rendered, so it warns. An
unverified Arabic spelling of a real person's name IS rendered, so it blocks.

---

## 5. Coding rules

### Immutability and types
- Never mutate; return new objects. Explicit types on every exported function.
- No `any`. Use `unknown` and narrow. Validate external input with Zod.

### RTL / LTR — this is where bugs hide
- **Logical properties only.** `inline-s-*` / `inline-e-*` / `pbs-*` / `pbe-*`
  in Tailwind 4.2+. Never `left`/`right`/`ml-`/`mr-`.
  (`start-*`/`end-*` are deprecated.)
- Wrap every LTR run inside RTL text in `.u-ltr` — phone numbers, emails,
  Latin brand names. Without it `04-884-8891` renders reordered.
- Mirror directional glyphs (chevrons, arrows) with `.u-flip`. Never mirror
  logos, photographs, the phone handset or the clock.
- Arabic and Hebrew take **no negative letter-spacing**. Tightening damages
  connected scripts.
- Use **Western digits (0–9) in Arabic** — Eastern Arabic-Indic numerals are a
  Gulf/Egypt convention and read as foreign in the Levant.

### Colour — a legal constraint, not a preference
`--color-signal` (`#2195D2`, the bright logo blue) measures **3.34:1** on white.
It **fails** WCAG AA for body text and fails as a button fill with a white
label. It is a **graphic colour only**: icons, rules, decorative marks, and
display type at 24px+.

Text, links and buttons use `--color-ink` (`#0C5283`, 8.09:1) or darker.

### Motion must fail visible
Scroll reveals hide content by default only under `.js-reveal`, which the
script adds **after** its observers are registered, plus a 2s failsafe that
reveals everything regardless. Never write a reveal that depends on JS
succeeding in order for content to be readable — a visitor may be in pain.

### Client JavaScript
Default to zero. Before adding an island, check whether a native element does
it: `<details>` for accordions and menus, `<dialog>` for modals, a real
`<form method="post">` for submission.

**Never import from `src/lib/validation.ts` in client code** — it imports Zod,
which cost 85KB of browser JS. Import from `src/lib/phone.ts` instead.

### Never hardcode clinic data
Phone numbers, addresses and hours come from `src/data/clinic.ts`. Both
reference clinics studied during discovery shipped three different phone
numbers across their own sites, and one linked Waze to the wrong street.

---

## 6. Accessibility

Israeli Standard **IS 5568** is normatively based on **WCAG 2.0 AA** (not 2.1 —
many vendor pages claim otherwise). Build to **WCAG 2.1 AA** as a safe superset.

Israeli national deviations that matter:
- **2.4.10 Section Headings is REQUIRED at AA** — stricter than WCAG. Heading
  order must never skip a level.
- 1.2.4 / 1.2.5 (captions, audio description) are **not** required.
- 3.1.2 (Language of Parts) is **disapplied**.

Also: no PDFs on the site (they fall under ת"י 5568 חלק 2, a separate and
harder standard). No accessibility overlay — overlays do not confer compliance,
and the US FTC fined a vendor $1M in April 2025 over exactly that claim.

The clinic has fewer than 25 employees, so it is **not** required to appoint a
רכז נגישות. Do not declare one.

---

## 7. Privacy

Amendment 13 to the Protection of Privacy Law has been in force since
**14 Aug 2025**.

- Collect the minimum. No ID number, date of birth, health fund or uploads.
- The free-text note stays **optional and capped**, and is labelled "do not
  include medical details". A field inviting clinical detail turns the lead
  store into one holding *especially sensitive* medical information and
  escalates its required security tier.
- Consent is **unticked by default** and never bundled. Marketing opt-in is a
  **separate** active checkbox — passive opt-out is not sufficient.
- Store `consent_notice_version` with every record. The regulator expects you
  to show *what* a person was shown when they consented.
- Keep transactional and marketing send paths physically separate. Adding a
  promotion to an appointment reminder converts it into an advertisement —
  ₪1,000 per message, no proof of harm required.
- Cookieless analytics only. Never Google Analytics or Meta Pixel.

---

## 8. Running the dev server

Use background mode so the shell stays free:

```bash
astro dev --background        # then: astro dev stop | status | logs
```

Astro reference for anything not covered here: <https://docs.astro.build> —
particularly [routing](https://docs.astro.build/en/guides/routing/),
[content collections](https://docs.astro.build/en/guides/content-collections/)
and [i18n](https://docs.astro.build/en/guides/internationalization/).

---

## 9. File hygiene

Every file needs a reason to exist. Never create `temp`, `new`, `final2`,
`backup`, `old`. Delete one-time scripts after they have run
(`scripts/seed-content.mjs` was one).

---

## 11. Definition of done

- [ ] `npm run verify` passes
- [ ] `npm run build` passes (with the launch gate, not `VERIFY_RELAX`)
- [ ] `npm test` passes
- [ ] `npm run lint:a11y` passes against the fresh build
- [ ] Verified in **all three locales**, both directions
- [ ] Verified at 375px and desktop
- [ ] axe-core: zero violations
- [ ] Heading order has no skips (`npm run lint:a11y` proves this mechanically)
- [ ] Anything claimed as *visually* verified was actually looked at. If it was
      not, say so — `docs/QA-CHECKLIST.md` is the list of what only a person
      can check
- [ ] No new medical claim introduced
- [ ] No unverified fact promoted to verified
- [ ] `HANDOFF.md` reflects reality
