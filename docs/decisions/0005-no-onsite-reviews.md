# ADR 0005 — No reviews or testimonials on this site

**Status:** Accepted · 2026-09-20
**This decision is legal, not editorial. Do not reverse it without counsel.**

## Context

The brief asked for a reviews section with a moderation pipeline.

## Decision

No reviews section. No testimonials. No `AggregateRating` or `Review` markup.
Reviews live **on Google**, where the patient publishes them.

## Why — blocked twice over

**Israeli law.** תקנות רופאי השיניים (פרסומת אסורה), תשס"ט-2009 prohibits use
of a patient's name, nickname, image, voice or likeness, and any information
that could identify them — reportedly **even with the patient's consent**.
Violation is a criminal matter. Republishing Google reviews with names on the
clinic's own site arguably converts them into the dentist's own advertising;
that is a legal grey area and needs counsel before anyone tries it.

**Google.** Structured data for reviews the reviewed entity controls is
explicitly **ineligible** for star rich results, and marking it up anyway risks
manual action. So it would not render even if it were lawful.

## Consequence

An entire moderation subsystem (submit → pending → approved → published) was
not built. Trust is carried instead by the doctor, the clinic, and the clarity
of the content.

## Instead

Stand up the Google Business Profile and ask every patient equally, never
incentivised — incentives violate both Google's policy and reg. 3's ban on
discounts and gifts.
