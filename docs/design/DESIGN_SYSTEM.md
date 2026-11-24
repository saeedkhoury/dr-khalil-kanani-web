# Design system

**"Mediterranean daylight on clinical porcelain."**

A cool, near-white canvas layered with progressively deeper blue-grey panels.
Depth comes from **tinted layers, never drop shadows** — that is what keeps it
clinical and calm rather than the soft shadowed-card look that defines the
generic dental template.

One saturated dark anchors everything: **Ink `#0C5283`**, taken straight from
the logo. It is the only saturated dark and must remain singular.

## The critical rule

`--color-signal` (`#2195D2`, the bright logo blue) measures **3.34:1 on white**.

- ❌ Fails WCAG AA for body text (needs 4.5:1)
- ❌ Fails as a button fill with a white label (also 3.34:1)
- ✅ Passes for graphics and 24px+ display type (needs 3:1)

**Signal is a graphic colour only.** Text, links and buttons use Ink (8.09:1)
or `--color-ink-deep` (11.10:1). In Israel this is legal exposure, not taste.

## Tokens

| Role | Token | Value | Contrast on porcelain |
|---|---|---|---|
| Page | `--color-porcelain` | `#FCFDFE` | — |
| Surface 1 | `--color-mist` | `#F1F6FA` | — |
| Surface 2 | `--color-haze` | `#E3EDF5` | — |
| Surface 3 | `--color-tide` | `#CFE0EE` | — |
| Ink | `--color-ink` | `#0C5283` | 8.09:1 ✅ |
| Ink deep | `--color-ink-deep` | `#083D63` | 11.10:1 ✅ |
| Signal | `--color-signal` | `#2195D2` | 3.28:1 — graphics only |
| Body text | `--color-body` | `#0F2A3D` | 14.53:1 ✅ |
| Muted text | `--color-muted` | `#4A6274` | 6.27:1 ✅ |
| WhatsApp | `--color-wa` | `#0D6E39` | white on it 6.35:1 ✅ |

`--color-wa` is **not** the WhatsApp brand green `#25D366` — that measures
4.31:1 with a white label and fails AA.

## Type

Noto Sans Hebrew / Arabic / Latin — modular but cross-script harmonised,
self-hosted and subset per locale. Base **17px**, not 16: Hebrew and Arabic
read better with the extra pixel.

Weight 300 for display sizes, 400 body, 600 for eyebrow labels and UI, 700 for
emphasis. Premium comes from weight discipline, spacing and the layered
surfaces — not from a decorative face.

Neither reference clinic uses Noto (one uses IBM Plex Sans Hebrew, the other
Rubik), so this also differentiates.

## Shape

Radius: cards 14px, buttons 12px, fields 10px, pills 999px. Consistency is
non-negotiable — mixed radii are the tell of an unsystematised UI.

## Motion language

Five rules govern every animation:

1. **Transform and opacity only.** Nothing that triggers layout.
2. **One easing** (`--ease-out`) everywhere. A single curve is what makes
   unrelated animations feel like one system.
3. **Motion marks arrival, never demands attention.** No looping, no
   auto-advancing, no parallax, no scroll-jacking.
4. **Nothing delays content.** Reveals are short and start early.
5. **No X-axis motion.** Every animation is Y or opacity, so none needs
   mirroring in RTL and none can break in Arabic or Hebrew. A deliberate
   constraint, not an oversight.

| Token | Value | Used for |
|---|---|---|
| `--dur-fast` | 150ms | State changes: hover, press, focus |
| `--dur-base` | 240ms | Card and surface transitions, accordion chevron |
| `--dur-slow` | 380ms | Scroll reveals |
| `--dur-entrance` | 480ms | Hero entrance only |

Stagger is CSS-only: set `--i` on each item and the shared rule applies
`calc(var(--i) * 60ms)`. No JS timing.

### Fail-visible

Content is visible by default. The hidden state applies only under
`.js-reveal`, added by the script **after** its observers register, backed by a
2s failsafe. The obvious inversion — hide by default, reveal with JS — means
any script failure leaves sections permanently blank. On a clinic site the
worst case must be "no animation", never "no page".

### What is deliberately not animated

Parallax, page transitions, scroll-jacking, auto-advancing carousels, text
scrambles, cursor effects. Wrong register for a clinic whose visitors may be
in pain.

## Anti-patterns

No neumorphism (its low-contrast embossing conflicts with a legal AA
requirement). No drop shadows for depth. No emoji as icons. No bright neon. No
AI-purple gradients. Minimum touch target 44px.
