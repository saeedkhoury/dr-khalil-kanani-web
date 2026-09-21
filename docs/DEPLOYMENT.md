# Deployment

## Target

Cloudflare Workers via `@astrojs/cloudflare`. Static pages plus one server
route (`/api/appointment-request/`).

Swapping to Vercel is a one-line adapter change; nothing else depends on it.

## Environment variables

See `.env.example`. Nothing is committed.

| Variable | Purpose | Required |
|---|---|---|
| `SUPABASE_URL` | Lead store endpoint | Yes — endpoint returns 503 without it |
| `SUPABASE_SERVICE_KEY` | Server-only insert key. **Never client-visible** | Yes |
| `VERIFY_RELAX` | Bypasses the launch gate. **Local preview only** | Never in CI |

## Bindings

- **KV namespace `RATE_LIMIT_KV`** — required. Without it rate limiting falls
  back to an in-memory map, which is per-isolate and therefore not a real
  limit across workers.

## Before first deploy

1. Resolve every launch blocker — run `npm run build` to list them.
2. Israeli legal review of the advertising posture, accessibility statement
   and privacy policy.
3. Create the `appointment_requests` table with RLS denying public reads;
   the endpoint is insert-only.
4. Bind `RATE_LIMIT_KV`.
5. Enable a strict CSP via Astro's CSP API — there are no third-party scripts,
   fonts or pixels, so the policy can be tight.
6. Verify `siteUrl` in `src/data/clinic.ts` matches the real domain; sitemap
   and canonicals derive from it.

## After deploy

1. Create the Google Business Profile — **single-script name** (dual-script
   names were banned 2026-08-10). Set the "Languages spoken" attribute.
2. Claim the Waze place.
3. Submit the sitemap in Search Console; verify all three locales index.
4. Confirm the form delivers end to end, and that a lead actually lands.

## Rollback

Static output — redeploy the previous build. The only stateful dependency is
the Supabase table, which is append-only from the site's side.
