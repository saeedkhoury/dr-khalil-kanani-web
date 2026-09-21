# Security

## Form endpoint

Defence in depth, cheapest first:

1. **Honeypot** — off-screen field; responds 200 so bots learn nothing
2. **Time-to-submit** — under 3s is a bot; also responds 200
3. **Rate limit** — 5/hour per IP (Cloudflare KV; in-memory fallback is dev-only)
4. **Server-side Zod validation** — never trusts the client
5. **Delivery** — durable store; fails loudly (503) rather than silently
   discarding a real patient enquiry

Error responses return **field names only** and never echo submitted values.

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
