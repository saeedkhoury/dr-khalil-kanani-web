# ADR 0010 — The doctor's work is managed in Edit Mode

**Status:** Implemented on the integration branch at the owner's explicit
direction · 2026-09-25. Not released.

## Decision

The owner changed an earlier requirement: `treatmentWork` ("עבודות הרופא",
the doctor's work) was developer-managed; it is now managed by the owner in
Edit Mode, like clinic photography. The two stay **separate collections** —
they are not merged, never share a file, and each has its own manager.

## What changed

- **Data.** The twelve records moved losslessly from the inline array in
  `src/data/media.ts` to `src/data/treatment-work.json`, generated from the
  array rather than retyped. Each record gained a stable `id` (its original
  file stem) and a `status`; nothing else changed. The public build after the
  migration is byte-identical to the build before it — same twelve images,
  same order, same text.
- **Rules.** `assertTreatmentWorkShape` (src/lib/data-schema.ts) validates the
  file at build, in `lint:data` and in the Worker. Files must start with
  `work-`; clinic files must not — so deleting from one gallery can never
  break the other. No framing: this gallery always shows the whole artwork.
  A title (caption) is optional but never partial; alt text is required in
  all three languages. Existing text was preserved and no description was
  invented — four images have no title, and the manager says so.
- **Claims.** These images are clinic posts labelled "before"/"after", so
  accurate alt text says so, and the `patient-identity` rule flags exactly
  that wording. For this file only, the plain before/after descriptor is
  removed before the rules run (`withoutBeforeAfterDescriptor`); every other
  rule — testimonials, patient stories, guarantees, success rates — still
  applies. The claims linter now scans this file (it scanned nothing of it
  before), and the Worker applies the same function before any commit.
- **Uploads.** A new or replacement doctor's-work image requires the owner's
  explicit approval checkbox at Save; the commit records "Owner approved
  publication: yes". The wording approves publication as the doctor's work
  and confirms no patient name or contact details appear. It deliberately
  asserts nothing about consent or legality.
- **Tests no longer depend on site images.** Suites that borrowed a
  doctor's-work photograph as a sample JPEG now generate one
  (`tests/helpers/jpeg.ts`), and tests that pinned the exact content (twelve
  files; an empty clinic gallery) now state invariants. Otherwise the first
  CMS edit would have failed CI and blocked the public deploy.

## What did NOT change

**This is a publishing instruction, not a legal conclusion.** As ADR 0009
records, neither Instagram publication nor owner supply establishes patient
consent or compliance with the Israeli dental advertising regulations, and
the `patient-identity` rule exists because such images are legally sensitive.
The CMS makes adding such images easier; it does not make them lawful. The
legal-review item remains **open** and is the owner's to close with counsel.
