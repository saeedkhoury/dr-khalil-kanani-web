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

- A patient, or any part of a patient
- A before/after treatment comparison
- Anything with a face, mouth, or intraoral view of a real person

Not with consent. Not cropped. Not anonymised.
See [ADR 0006](./decisions/0006-no-before-after-gallery.md).

If you receive such an image: move it to `.private-assets/` (gitignored) and
tell the owner why it cannot be used.

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

Commit the **source JPEG**. Astro's `astro:assets` generates AVIF/WebP and the
responsive sizes at build time — do not pre-optimise or commit derivatives.

Record the intrinsic `width` and `height` in the manifest. They are required so
the grid can reserve space and avoid layout shift.

## Registering an asset

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

```bash
npm run lint:assets    # also runs automatically on commit
```

To bypass for a genuinely reviewed exception: `ASSETS_ALLOW=1 git commit ...`
The bypass prints what it let through.
