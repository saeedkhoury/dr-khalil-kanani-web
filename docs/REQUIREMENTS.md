# Requirements

Authoritative product requirements. Ranks above everything except Israeli law.

## Goal

The clinic has no meaningful web presence. This site is the acquisition
channel. It optimises for **trust, clarity, easy contact and local
discoverability** — in that order.

## Must

1. Trilingual he / ar / en with correct RTL and LTR.
2. Present the doctor and the clinic's treatments factually.
3. Make contacting the clinic trivially easy on a phone.
4. Accept appointment **requests** — not real-time booking.
5. Conform to WCAG 2.1 AA (IS 5568 baseline is 2.0 AA).
6. Comply with Israeli dental advertising regulations.
7. Comply with the Protection of Privacy Law as amended.
8. Be fast on mobile over Israeli mobile networks.
9. Be maintainable by one developer.

## Must not

- Publish any unverified fact about the doctor or clinic.
- Publish testimonials, patient photographs, prices or promotions.
  The owner's subsequent explicit instruction permits the three selected
  Instagram work photographs listed in ADR 0009 as a scoped project exception;
  it does not assert legal clearance or permit other patient material.
- Use manipulative urgency.
- Claim an unrecognised specialty.
- Auto-redirect visitors by IP or browser language.

## Primary conversions

1. Phone call (fastest, and the flyer's own call to action)
2. WhatsApp (dominant Israeli channel; stores no data on our side)
3. Appointment request form (after-hours path)

## Out of scope for now

Real-time scheduling · patient portal · payments · blog · admin dashboard ·
reviews · before/after gallery.

The last two are out of scope because they are **prohibited**, not merely
deferred. See ADR 0005 and 0006.

The later owner-directed scope exception in ADR 0009 adds only the selected
Instagram work gallery. Reviews remain out of scope.
