# 0008 — The map is a click-to-load facade

**Status:** Accepted · **Date:** 2026-09-21

## Context

The location section offers Google Maps and Waze as links. Visitors also want
orientation — "which part of the village is this?" — which a link cannot give
without leaving the page.

The obvious answer is a Google Maps iframe. It is also the answer that would
quietly undo the site's privacy posture: the site currently contacts **zero**
third parties on load, which is what lets it ship without a cookie banner and
is the foundation of its Amendment 13 position. An eager iframe would contact
Google, set cookies and add several hundred kilobytes before the visitor had
asked for anything.

## Decision

A **click-to-load facade** (`src/components/sections/MapFacade.astro`).

Until the visitor presses the button, the map is a locally drawn placeholder
built from the site's own design tokens. The iframe is **created in JavaScript
on press**, so no iframe, `preconnect` or `dns-prefetch` for Google exists in
the served HTML at all — the guarantee is structural rather than a promise.

The button is accompanied by a line stating that the map loads from Google and
that nothing is sent until it is pressed. It is said **before** the press,
because a visitor who has not been told is not consenting.

The embed uses the keyless `output=embed` form, so there is no API key to
publish on a static site, no billing account, and no credential for a solo
clinic to own and eventually lose.

The facade renders only once `hasGeo()` is true. A map centred on (0, 0) points
at the Atlantic; a map centred on a guessed pin is worse, because it sends
patients somewhere with total confidence.

## Consequences

- Zero third-party contact on load is preserved, and is now enforced by a test
  asserting no literal `<iframe>` and no preconnect appears in the component.
- Visitors who want a map pay for it; visitors who do not, do not.
- The map is one press slower for the minority who want it. Acceptable: the
  primary navigation path for someone actually driving is the Maps/Waze link above
  it, which opens their own app.
- If Google changes the keyless embed URL, the facade breaks visibly rather
  than silently — it is one constant in one file.
