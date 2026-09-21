---
name: design-system
description: Use when choosing or changing colours, typography, spacing, radius or motion. Encodes the contrast rule that is a legal constraint here, not a preference.
---

# Design system

## Purpose

One rule in this system is legal exposure rather than taste, and it is easy to
violate by reaching for the obvious brand colour.

## The rule that matters

`--color-signal` (`#2195D2`, the bright logo blue) measures **3.34:1 on white**.

- ❌ Body text — fails AA (needs 4.5:1)
- ❌ Button fill with a white label — also 3.34:1, fails
- ✅ Icons, rules, decorative marks, display type 24px+ — passes 3:1

**Signal is a graphic colour.** Text, links and buttons use `--color-ink`
(`#0C5283`, 8.09:1) or `--color-ink-deep` (11.10:1).

A naive implementation uses the bright logo blue for links and creates legal
exposure on day one. Israel mandates WCAG conformance.

## When to use

Choosing a colour, adding a component, changing type scale, spacing, radius or
motion.

## When NOT to use

Content, routing, server logic.

## Workflow

1. **Use tokens. Never arbitrary values.** Every colour, size, radius and
   duration is in `src/styles/global.css` under `@theme`.

2. **Depth comes from layered tinted surfaces, not shadows.**
   porcelain → mist → haze → tide. A drop shadow is the tell of the generic
   dental template this design deliberately avoids.

3. **Verify any new colour before using it.** Compute the ratio; do not eyeball
   it. The WhatsApp brand green `#25D366` fails at 4.31:1 with a white label,
   which is why `--color-wa` is `#0D6E39` (6.35:1).

4. **Weight discipline carries the premium feel.** 300 for display sizes,
   400 body, 600 for eyebrow labels *only*, 700 for emphasis. The uppercase +
   0.08em tracking treatment is used on `.eyebrow` and nowhere else — applying
   it elsewhere dilutes the one typographic accent in the system.

5. **Radius is fixed per element type.** Cards 14px, buttons 12px, fields 10px,
   pills 999px. Mixed radii are the tell of an unsystematised UI.

6. **Motion is the subtle tier.** 380ms reveal, 150ms state changes. Motion
   conveys arrival, never decoration. `prefers-reduced-motion` is honoured
   globally and content renders fully without JS.

7. **Minimum touch target 44px.** No emoji as icons — use the SVG set in
   `src/components/primitives/Icon.astro`.

## Verification

Compute contrast for any new pair:

```bash
python3 -c "
def lin(c):
    c/=255
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16) for i in (0,2,4)]
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def cr(a,b):
    la,lb=L(a),L(b); hi,lo=max(la,lb),min(la,lb)
    return (hi+0.05)/(lo+0.05)
print(f'{cr(\"#FOREGROUND\",\"#BACKGROUND\"):.2f}:1')
"
```

Gates: body text 4.5 · large text and UI components 3.0.

Then axe-core in the browser, zero violations.

## Output

Token-based styling, contrast verified with real numbers, axe clean.
