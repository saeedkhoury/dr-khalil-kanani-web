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
