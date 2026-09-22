# Asset convention

Everything the site may publish as an image is registered in
**`src/data/media.ts`**. That file is both the gallery's data source and the
allowlist enforced by `scripts/check-assets.mjs` at commit time.

## The rule

> **Open every image before you commit it. No exceptions.**

On 2026-09-21 thirteen images were added to `src/assets/images/` and swept into
a commit by `git add -A` without anyone looking at them. Every one that was
later inspected was patient before/after photography — material Israeli dental
advertising regulations prohibit publishing. They reached the public repository
before being reviewed.

The guard cannot recognise a patient photograph. What it can do is make it
impossible to commit an image without having classified it, because
registration requires a category and alt text in three languages — neither of
which you can write without having seen the file.

## What may never be published

The owner's later explicit instruction adds the three individually reviewed
Instagram work posts documented in [ADR 0009](./decisions/0009-owner-directed-instagram-gallery.md).
That selection is the sole exception to the default exclusion below. It does
not establish patient consent or legal clearance.

- A patient, or any part of a patient
- A before/after treatment comparison
- Anything with a face, mouth, or intraoral view of a real person

Not with consent. Not cropped. Not anonymised.
See [ADR 0006](./decisions/0006-no-before-after-gallery.md).

If you receive such an image: move it to `.private-assets/` (gitignored) and
tell the owner why it cannot be used.

## Two separate content categories

`src/data/media.ts` holds five slots. They are deliberately disjoint, and the
TypeScript types enforce it — an asset from one cannot be assigned to another.

| Slot | Holds | Renders in |
|---|---|---|
| `heroImage` | One landscape frame | Homepage hero |
| `portrait` | One photograph of Dr. Kanani | Doctor section, `schema.org` image |
| `clinicPhotography` | exterior · reception · treatment-room · equipment · doctor-working · team · atmosphere | Clinic gallery |
| `treatmentWork` | Treatment and result cases only | Treatment gallery |
| `illustrations` | Original artwork | Illustration gallery |

**Treatment-result images are never clinic photography.** A result photograph
answers "what can this clinic do". A clinic photograph answers "what is this
place, and who will be treating me". Substituting one for the other is how a
dental site ends up looking like a before/after advertisement, which is also
the form Israeli advertising regulations most directly target.

A gallery is told which collection to render:

```astro
<ClinicGallery locale={locale} kind="clinic" />
<ClinicGallery locale={locale} kind="work" />
```

`kind` is required and the component never infers it from what is in an array.
Inference is what would let a treatment photograph silently become the clinic
gallery the first time one was registered.

Adding to `treatmentWork` requires the owner's explicit, per-image instruction
(ADR 0009). It is not covered by any blanket approval.

## What the site needs

| Category | What it shows | Suggested count |
|---|---|---|
| `exterior` | The building, entrance, signage | 1–2 |
| `reception` | Waiting area, front desk | 2 |
| `treatment-room` | Chair, room, lighting — **empty of patients** | 2–3 |
| `equipment` | Technology, sterilisation, imaging | 2 |
| `doctor` | Dr. Kanani working, or portrait | 2 |
| `team` | Staff, if any | 0–2 |
| `atmosphere` | Detail shots, texture, light | 1–2 |
| `illustration` | Clearly labelled artwork of inanimate dental objects | 3 currently |
| `treatment-work` | The three owner-selected, source-linked Instagram posts in ADR 0009 | 3 |

`illustrations` is separate from the clinic-photo `gallery` array. When there
are no clinic photographs, the component shows the illustrations with explicit
AI-art disclosure in all languages. Never use generated art to imply a real
clinic interior, real patient or treatment result. Current originals and exact
generation prompts are recorded in [ILLUSTRATIONS.md](./ILLUSTRATIONS.md).

## Filenames

```
<category>-<subject>-<nn>.<ext>
```

Lowercase, hyphens, ASCII only, two-digit index.

```
reception-waiting-area-01.jpg
treatment-room-chair-02.jpg
doctor-portrait-01.jpg
```

Never keep camera or phone export names (`PHOTO-2026-09-21-15-01-22 3.jpg`) —
they carry no meaning and the spaces break URLs.

## Dimensions and format

| Use | Aspect | Min width |
|---|---|---|
| Gallery feature | 3:2 landscape | 2000px |
| Gallery standard | 3:2 or 4:5 | 1600px |
| Doctor portrait | 4:5 portrait | 1400px |

Commit the **source JPEG**, or original PNG for generated illustrations.
The current illustrations are 1536 × 1024 originals; retain their native
resolution rather than upscaling to the photographic recommendations above.
Astro's `astro:assets` generates WebP and the
responsive sizes at build time — do not pre-optimise or commit derivatives.

Record the intrinsic `width` and `height` in the manifest. They are required so
the grid can reserve space and avoid layout shift.

## Registering an asset

**Which file you edit depends on which category it is**, and that split is
deliberate — see "Two separate content categories" above.

| Category | Registered in | Edited by |
|---|---|---|
| Clinic photography — building, rooms, equipment, team, atmosphere | `src/data/clinic-photography.json` | the owner, through the admin CMS |
| Treatment work, illustrations, hero, portrait | `src/data/media.ts` | a developer, in a pull request |

The CMS can only ever write the first. A `treatment-work` category in the JSON
is rejected by the schema and again by the commit guard; patient and treatment
imagery is a legal question under Israeli dental advertising regulation, not an
editorial one, so it never becomes self-service.

### Clinic photography — `src/data/clinic-photography.json`

```json
{
  "file": "reception-waiting-area-01.jpg",
  "category": "reception",
  "width": 2400,
  "height": 1600,
  "status": "published",
  "alt": {
    "he": "אזור ההמתנה במרפאה, עם כיסאות וחלון גדול",
    "ar": "منطقة الانتظار في العيادة، مع مقاعد ونافذة كبيرة",
    "en": "The clinic waiting area, with seating and a large window"
  }
}
```

`status` is required — `"published"` or `"unpublished"`. There is no default:
an absent state would be ambiguous, and guessing "published" would publish a
photograph nobody chose to publish. Unpublishing keeps the record and filters
it out on read, so it is reversible; only removing the line deletes it.

`file` is the record's identity. There is no separate id, and the same filename
may not appear twice — two records for one image would make unpublishing look
like it did nothing.

`needsEnglishReview: true` is optional, and marks English alt text that is
still a copy of another locale's. Whoever writes real English deletes the key.

### Developer-managed media — `src/data/media.ts`

```ts
{
  file: 'reception-waiting-area-01.jpg',
  category: 'reception',
  width: 2400,
  height: 1600,
  feature: true,
  alt: {
    he: 'אזור ההמתנה במרפאה, עם כיסאות וחלון גדול',
    ar: 'منطقة الانتظار في العيادة، مع مقاعد ونافذة كبيرة',
    en: 'The clinic waiting area, with seating and a large window',
  },
}
```

**Alt text describes what is shown**, for someone who cannot see it. These are
meaningful images, so an empty alt is never correct. Do not write "clinic
photo" — write what is in the frame.

## Ordering

Manifest order is display order. Reordering the gallery is moving lines in this
file; no component changes.

## Checking

Two commands, two scopes, **one implementation** — the modes differ only in
which files they collect, so they cannot drift apart and start disagreeing
about what is allowed.

```bash
npm run lint:assets       # STAGED: what this commit adds. Runs on every commit.
npm run lint:assets:full  # FULL: every tracked asset. Used by `npm run verify`.
npm run lint:data         # the JSON manifests' shape. Also part of `npm run verify`.
```

| | Staged mode | Full mode |
|---|---|---|
| Looks at | files staged for this commit | every file tracked in the repository |
| Runs from | the pre-commit hook | `npm run verify`, and CI always |
| Catches | an unreviewed image being added now | an unreviewed image already committed, and a registration whose image does not exist |
| Cost | fast enough to sit on every commit | a full repository scan |

Full mode additionally reports a record pointing at a missing image. Staged
mode deliberately does not: mid-commit, a registration and its image
legitimately arrive together, and the image is not tracked yet.

`npm run lint:data` is separate because it answers a different question — not
"was this image reviewed" but "is this file's shape valid". The build already
refuses invalid data; the command exists so the refusal has a name you can act
on instead of a stack trace out of `astro build`.

To bypass for a genuinely reviewed exception: `ASSETS_ALLOW=1 git commit ...`
The bypass prints what it let through and is refused in CI. Registrations are
read from the Git index: stage the manifest together with the reviewed image.
An unstaged registration can never approve a staged image.
