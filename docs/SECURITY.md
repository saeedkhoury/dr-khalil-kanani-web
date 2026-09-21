# Security

## Form endpoint

Order of checks:

1. **Same-origin** — Astro's `security.checkOrigin` (default true) rejects
   cross-site form POSTs with 403 before the handler runs. The handler repeats
   the check as defence-in-depth, no stricter than Astro's.
2. **Spam signals** — honeypot + time-to-submit. **Recorded, not enforced.**
3. **Rate limit** — 5/hour per hashed IP (Cloudflare KV; in-memory fallback)
4. **Server-side Zod validation** — never trusts the client
5. **Delivery** — durable store; fails loudly (503) rather than silently
   discarding a real patient enquiry

Error responses return **field names only** and never echo submitted values.
The rate-limit key is a SHA-256 prefix of the IP, so no raw address is written.

### Why spam signals do not drop the submission

The endpoint used to return a fake `{ok:true}` when the honeypot was filled or
the form was submitted quickly. Password managers routinely autofill hidden
fields, and a returning patient can legitimately submit in under three seconds.
A real person in pain would have seen "request sent" and nobody at the clinic
would ever have seen it.

For a medical practice a lost enquiry costs far more than a junk row, so
signals now mark the record `spam_suspected` and it is still stored. The
response shape is unchanged, so a bot learns nothing either way.

The honeypot field is named `hp_check`, not `company` — the latter is a prime
autofill target — and carries no visible label.

### Testing the origin check

`Origin` is a forbidden header name, so `fetch()` in the browser silently
replaces a spoofed value with the real one and every request looks
same-origin. Verify with curl or another non-browser client, never from
browser JS.

## Headers and transport

HTTPS only. Astro's CSP API is available and should be enabled at deploy.
No third-party scripts, no external fonts, no tracking pixels — so the
policy can be strict.

## Secrets

`SUPABASE_URL` / `SUPABASE_SERVICE_KEY` via environment only. Never committed,
never client-visible. `.env` is gitignored; `.env.example` documents the shape.

## Data at rest

Restricted access permissions, encryption at rest, audit logging. RLS denies
all public reads; the endpoint is insert-only.

## Dependencies

Minimal by design: astro, tailwind, sitemap, motion, zod. Zod is server-only —
see `src/lib/phone.ts` for why.
