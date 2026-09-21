# ADR 0009 — Owner-directed Instagram work gallery

**Status:** Implemented at the owner's explicit direction · 2026-09-21

The owner clarified that the requested photographs are the doctor's treatment
work, supplied the clinic's Instagram profile, and explicitly instructed us to
publish those photographs after the earlier repository exclusion was explained.
That current instruction supersedes the project's blanket exclusion in ADR
0006 for the three individually reviewed assets below. It is not a blanket
approval to publish other patient material.

This records a publishing instruction, not a legal conclusion. Instagram
publication does not itself establish patient consent or regulatory compliance;
neither was independently verified. The existing legal-review item remains open.

## Sources checked

The profile and individual posts were opened in the browser on 2026-09-21.
Each selected post was visually compared with the owner-supplied local original
in `/Users/saeedkhoury/Desktop/dr.khalilkanani pictures/`. The website uses those
original files, not screenshots of Instagram, and links directly to each post.

| Published file | Supplied original | Original post |
|---|---|---|
| `work-veneers-01.jpg` | `PHOTO-2026-09-21-15-01-22 6.jpg` | [Veneers, September 11](https://www.instagram.com/p/DdJ042BMJUu/) |
| `work-cleaning-01.jpg` | `PHOTO-2026-09-21-15-01-22 8.jpg` | [Cleaning, September 16](https://www.instagram.com/p/DdWvC8csM-6/) |
| `work-cleaning-02.jpg` | `PHOTO-2026-09-21-15-01-22 4.jpg` | [Cleaning, July 18](https://www.instagram.com/p/Da8QjY7MiIP/) |

## Presentation

- Heading and captions identify these as the doctor's work, not clinic interiors
  or illustrations. Descriptive alt text is supplied in Hebrew, Arabic and English.
- The complete artwork is shown without cropping or retouching. Full-size
  viewing, keyboard navigation, source links and focus restoration are retained.
- No comments, patient names, review counts, discounts or promises are added
  to the website copy. The original images retain their existing printed text.
- Instagram links are ordinary outbound links; no Meta tracking or automatic
  embed requests are added.
- The removed portrait placeholder stays removed. No doctor portrait is invented.
- Other supplied images remain outside the published manifest. New treatment
  assets require separate review and source attribution.

The asset guard, production launch gate, claims linter and other checks stay
enabled. Unit coverage records the exact selected file/source pairs.

## Presentation update — 2026-09-21

At the owner’s subsequent request, individual post links were removed from
cards and the lightbox. The photos remain viewable; a single social-profile
button row replaces repeated outbound links. Source URLs remain recorded in
the manifest and this decision for provenance. Facebook is rendered only once
its exact clinic URL is supplied.


## Extension — 2026-09-21: the remaining nine

The owner reviewed a per-image inspection report and approved publishing every
remaining unique image from the supplied folder. The earlier instruction to
leave them unused is superseded.

Thirteen source files, **twelve unique** — one is a byte-identical duplicate
and was skipped rather than published twice.

| Published file | Supplied original | Provenance |
|---|---|---|
| `work-restoration-01.jpg` | `PHOTO-2026-09-21-15-01-22.jpg` | owner-supplied |
| `work-restoration-02.jpg` | `PHOTO-2026-09-21-15-01-22 2.jpg` | owner-supplied |
| `work-restoration-03.jpg` | `PHOTO-2026-09-21-15-01-22 3.jpg` | owner-supplied |
| `work-restoration-04.jpg` | `PHOTO-2026-09-21-15-01-23 3.jpg` | owner-supplied |
| `work-cleaning-03.jpg` | `PHOTO-2026-09-21-15-01-22 5.jpg` | owner-supplied |
| `work-veneers-02.jpg` | `PHOTO-2026-09-21-15-01-22 7.jpg` | owner-supplied |
| `work-whitening-01.jpg` | `PHOTO-2026-09-21-15-01-22 9.jpg` | owner-supplied |
| `work-extraction-01.jpg` | `PHOTO-2026-09-21-15-01-23.jpg` | owner-supplied |
| `work-extraction-02.jpg` | `PHOTO-2026-09-21-15-01-23 4.jpg` | owner-supplied |

**Skipped as a duplicate:** `PHOTO-2026-09-21-15-01-23 2.jpg`, md5
`46e6b028…`, identical to `PHOTO-2026-09-21-15-01-22 8.jpg`, already published
as `work-cleaning-01.jpg`.

### Provenance is now recorded per asset

The three originals were matched against public Instagram posts; these nine
were supplied directly as local files. The evidence differs — an Instagram
match can be re-checked against a public post, an owner-supplied file cannot —
so `MediaAsset.provenance` records which route applied rather than implying
they were verified the same way. A test asserts that an owner-supplied asset
carries no `sourcePostUrl` it never had.

**Neither route establishes patient consent or regulatory compliance.** That
remains an open item for Israeli counsel, unchanged by this extension.

### What was NOT done

- **Pixels untouched.** Several images carry Hebrew marketing text baked in,
  including outcome claims ("ללא כאבים", "תוצאות מדהימות"). Nothing was
  cropped, retouched or translated.
- **Those claims were not transcribed into alt text.** Alt text describes what
  the image shows and stops there. Copying an embedded promise into alt text
  would turn it into site copy — and the claims linter, which reads copy but
  not pixels, would then be routed around. A test enforces this.
- **Not used as clinic photography.** All twelve are `treatment-work`. The
  hero, the doctor portrait and `clinicPhotography` remain empty and still need
  real photographs; see docs/ASSETS.md.
