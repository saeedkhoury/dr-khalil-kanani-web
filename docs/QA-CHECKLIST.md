# Manual visual QA checklist

**Why this exists:** the automated gates check what can be checked mechanically
— heading order, duplicate ids, missing alt, `lang`/`dir`, claims wording,
homoglyphs, and 76 unit tests. None of them can see the page. Everything below
needs a person with eyes on a real browser.

**Partial QA completed 2026-09-21.** Chromium/axe covers the full three-locale,
three-width matrix. Homepage/contact screenshot samples (top, middle, footer)
and a synthetic gallery lightbox were opened and inspected. Checked items
below have supporting browser evidence. Unticked items still need human or
real-device review; do not read automated results as covering those.

Run through it in a browser — `npm run dev`, then `/he/`, `/ar/`, `/en/`.

---

## A. Per locale × per width

Nine passes: `he`, `ar`, `en` × 375px, 768px, desktop.

- [ ] Text direction is correct throughout; nothing is mirrored that should not be
- [ ] Latin runs inside Hebrew/Arabic (phone numbers, "Google", "WhatsApp") read
      left-to-right and do not reorder around punctuation
- [ ] Phone numbers never show a leading or trailing character on the wrong side
- [x] No horizontal scrollbar at 375px on any localized page (also 768/1440px)
- [ ] Headings do not overflow their container in Arabic (longest strings)
- [ ] The Arabic font renders — not a system fallback
- [ ] Line length stays readable; nothing runs edge to edge

## B. Hero

- [ ] The typographic hero reads as a designed choice, not a missing image
- [ ] The display heading does not wrap into an awkward orphan in any locale
- [ ] The fact strip sits on the hero rather than floating away from it
- [ ] Entrance animation runs once, in reading order, and is quick

## C. Sticky mobile action bar

- [x] Never covers footer content — scroll to the very bottom on all three
      locales and confirm the last line is reachable
- [ ] Never covers a form field's error message
- [ ] Buttons are comfortably thumb-sized in the bottom corners

## D. Interaction states

- [ ] Every link and button has a visible focus ring, **including** on the dark
      ink-filled buttons where a dark outline could disappear
- [ ] Tab order follows visual order in RTL, not DOM order surprises
- [ ] Treatment card hover: the rule draws across, the card lifts, the chevron
      travels **towards the reading direction** (left in he/ar, right in en)
- [ ] Nothing shifts layout on hover

## E. Motion

- [x] Reveals/failsafe leave content visible, including when observer setup fails
- [x] With `prefers-reduced-motion: reduce` everything appears instantly and
      nothing is hidden *(macOS: System Settings → Accessibility → Display →
      Reduce motion)*
- [x] With JavaScript disabled entirely, every section is visible
- [ ] Dialog entry (once a gallery exists) feels like arrival, not a glitch

## F. Screen reader

At minimum one full pass with VoiceOver (⌘F5) on `/he/` and `/en/`.

- [ ] Heading navigation (VO+⌘+H) produces a sensible outline
- [ ] The language switcher announces what it does
- [ ] Icon-only controls announce a name, not "button"
- [ ] The rating figure is announced as a number, not as a row of stars
- [ ] The lightbox traps focus and returns it to the tile on close

## G. Contrast — eyes, not just the ratio script

- [ ] `--color-signal` (#2195D2) appears **only** as a graphic or icon, never as
      body text and never as a button fill. It is 3.34:1 and fails for text.
- [ ] White text on `--color-ink` and on `--color-wa` is legible on a phone
      outdoors, not only on a calibrated monitor

## H. Once real data arrives

- [ ] **Map facade:** press "Show map" and confirm the pin is the actual clinic,
      not merely a plausible point in the village
- [ ] **Map facade:** confirm the network panel shows **zero** requests to
      Google before the press, and requests only after it
- [ ] **Rating:** the figure and count match the live Google profile exactly
- [ ] **Gallery:** every photo has been opened and contains no patient, no part
      of a patient, and no before/after comparison
- [ ] **Hours/address:** match what the clinic actually does, including the
      Friday/Saturday pattern

## I. Real devices

- [ ] One real iPhone, Safari — not a simulator
- [ ] One real Android, Chrome
- [ ] Tap every phone number and WhatsApp button and confirm the correct app
      opens with the correct number and prefilled message

---

## Additional checks

| Tool | What it catches that the gates do not |
|---|---|
| axe-core | Completed in Chromium; zero WCAG 2/2.1 A/AA violations, including synthetic populated components |
| Lighthouse (mobile, throttled) | Real LCP/CLS/INP on the actual fonts |
| WebPageTest, Israel region | Latency from where visitors actually are |
| A native Hebrew and a native Arabic reader | Tone, dialect, and whether the Arabic translation reads as written by a person |

The last row is the one that matters most and the one no tool replaces.
