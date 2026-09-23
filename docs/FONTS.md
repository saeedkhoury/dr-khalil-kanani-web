# Font provenance and reproducible builds

The site uses Noto Sans Hebrew (Hebrew and its Latin subset), Noto Sans Arabic
(Arabic), and Noto Sans (Latin). Each face is a variable WOFF2 supporting the
existing 300, 400, 600, and 700 weights. Astro's local font provider copies
these four repository-controlled files into `_astro/fonts/`; `<Font>` in
`BaseLayout.astro` still emits `font-display: swap`, locale-scoped preloads, and
optimized fallback stacks. Hebrew and Arabic remain RTL; English remains LTR.

The files below are **the exact bytes in the accepted public-output baseline**.
Each SHA-256 was also checked against the indicated Google Fonts CDN response
on 2026-09-24. The CDN path versions describe the served files; they are not
a claim about an upstream source release. The current Google Fonts metadata
links Noto Sans Hebrew to upstream release 3.001, Noto Sans Arabic to 2.012,
and Noto Sans to 2.015, but the SHA-256 values, not those labels, identify the
files committed here.

| Included file | Family and subset | CDN source | SHA-256 |
| --- | --- | --- | --- |
| `src/assets/fonts/noto-sans-hebrew-hebrew.woff2` | Noto Sans Hebrew, Hebrew | [v50 Hebrew](https://fonts.gstatic.com/s/notosanshebrew/v50/or30Q7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaePiWTNzWNf72cWk.woff2) | `30420f52f9569d1a89d5ee276a40e9d984808ae794eb91570b2a74e3d2275f09` |
| `src/assets/fonts/noto-sans-hebrew-latin.woff2` | Noto Sans Hebrew, Latin | [v50 Latin](https://fonts.gstatic.com/s/notosanshebrew/v50/or30Q7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaePiUTNzWNf72.woff2) | `3cd723aa62514a13f5abcf94664d2dd0a20d3fad79962f796e77e5f240b32d98` |
| `src/assets/fonts/noto-sans-arabic-arabic.woff2` | Noto Sans Arabic, Arabic | [v33 Arabic](https://fonts.gstatic.com/s/notosansarabic/v33/nwpCtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlj4wv4rqxzLIhjE.woff2) | `69cdf0bf005fdc9cc13fb5a8581697eb9ba8f761aeaf255fc717d14c62c38891` |
| `src/assets/fonts/noto-sans-latin.woff2` | Noto Sans, Latin | [v42 Latin](https://fonts.gstatic.com/s/notosans/v42/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5a7du3mhPy0.woff2) | `afc7a910f4ff04ee2ff7b3a2ef8b24f8340b8ea8d8125f2779f1f0b69d1b56b9` |

Google Fonts identifies each family as licensed under the **SIL Open Font
License 1.1**: [Hebrew metadata](https://github.com/google/fonts/blob/main/ofl/notosanshebrew/METADATA.pb),
[Arabic metadata](https://github.com/google/fonts/blob/main/ofl/notosansarabic/METADATA.pb),
and [Latin metadata](https://github.com/google/fonts/blob/main/ofl/notosans/METADATA.pb).
The copyright notices and complete license terms are included alongside the
fonts as `OFL-notosanshebrew.txt`, `OFL-notosansarabic.txt`, and
`OFL-notosans.txt`. OFL 1.1 permits bundling and redistributing the fonts with
software when the copyright notice and license accompany each copy. These
files are self-hosted by this site; no visitor request to Google Fonts is
needed.

The old Astro Google provider fetched CSS/font metadata during production
builds, and its response could change even with the same source and lockfile.
Astro then hashed the provider URL and configuration into generated font paths.
The local provider changes those generated paths and inline font CSS **once**,
even though the four font payloads are byte-identical to the accepted baseline.
The baseline is preserved unchanged for auditing. A later intentional font
upgrade requires checking source/license and updating these hashes.
