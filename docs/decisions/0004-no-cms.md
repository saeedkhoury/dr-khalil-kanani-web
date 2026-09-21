# ADR 0004 — No CMS, no admin dashboard

**Status:** Accepted · 2026-09-20

## Decision

Content stays git-managed. No CMS, no custom admin UI.

## Why

| Content | Changes | Managed by |
|---|---|---|
| Treatments, FAQ, doctor bio | Rarely | Markdown / TS in repo |
| Hours, phone, address | Rarely | `src/data/clinic.ts` |
| **Leads** | Constantly | **Supabase Studio** — free, zero code |
| Reviews, before/after | Never (prohibited) | — |

The clinic has **9 Instagram posts in its entire history**. A CMS would be
built for an editing cadence that does not exist, and the one genuinely
high-frequency surface — leads — already has a usable UI for free.

## Revisit when

The owner asks twice, unprompted, to edit content themselves. Keystatic or a
similar git-based editor would then sit on top of the existing markdown with
no migration.
