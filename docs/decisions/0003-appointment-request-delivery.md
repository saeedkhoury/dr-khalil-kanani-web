# ADR 0003 — Appointment request delivery

**Status:** Accepted · 2026-09-20

## Decision

Persist to **Supabase Postgres** and notify. Not email alone.

## Why

Email-only was the simplest option and was rejected because:

- No audit trail and no status tracking.
- You **cannot reliably delete from inboxes**, forwarded threads and backups —
  which makes both the 12-month retention policy and any deletion request under
  Amendment 13 undeliverable.
- Lost leads if mail is filtered, with no way to notice.

The endpoint **fails loudly** (503, logged) when delivery is unconfigured
rather than silently discarding a real patient enquiry.

## Alternatives

| Option | Verdict |
|---|---|
| Email only | Rejected, above |
| + WhatsApp Business API | Deferred — needs Meta Business verification |
| CRM | Overkill for a solo clinic |

## Consequence

The Supabase table doubles as the clinic's lead inbox, which is why no admin
dashboard is built (ADR 0004).
