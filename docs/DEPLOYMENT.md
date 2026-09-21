# Deployment

## Target

**GitHub Pages**, custom domain `www.drkhalilkanani.com`, via
`.github/workflows/deploy.yml` on push to `main`.

Fully static — no adapter, no server routes. The workflow uploads `./dist`.

⚠️ **The workflow runs `npm run build:preview`, which sets `VERIFY_RELAX=1` and
therefore BYPASSES the launch gate.** The live site is currently serving
placeholder address and hours. That was a deliberate choice to get the site up,
but it means the gate is not protecting production. Either resolve the
outstanding facts or make the bypass an explicit, reviewed decision.

### Verify the contact path after every deploy

The form is the site's only conversion. A build that succeeds proves nothing
about whether a request reaches the dentist. After each deploy, submit a real
test request and confirm it arrives on WhatsApp. The previous architecture
passed every build check while losing every live enquiry.

## Environment variables

See `.env.example`. Nothing is committed.

| Variable | Purpose | Required |
|---|---|---|
| `SUPABASE_URL` | Lead store endpoint | Yes — endpoint returns 503 without it |
| `SUPABASE_SERVICE_KEY` | Server-only insert key. **Never client-visible** | Yes |
| `VERIFY_RELAX` | Bypasses the launch gate. **Local preview only** | Never in CI |

## Bindings and secrets — read this before deploying

On Cloudflare Workers, secrets and bindings are **not** on `process.env`, not
on `globalThis`, and not in `import.meta.env` at runtime. They come from
`import { env } from 'cloudflare:workers'`, which is what `src/lib/env.ts`
does. Reading them any other way fails silently and in the worst direction:
the rate limiter decides KV is unavailable, and delivery decides it is
unconfigured and 503s every genuine patient enquiry.

Required in `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  { "binding": "RATE_LIMIT_KV", "id": "<create with: wrangler kv namespace create RATE_LIMIT_KV>" }
]
```

Secrets, set once per environment:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
```

After changing `wrangler.jsonc`, regenerate types so `npm run check` stays
accurate:

```bash
npx wrangler types
```

Without the KV binding the rate limiter falls back to a per-isolate in-memory
map — not a durable limit — and logs a loud warning on every request. It fails
**open** deliberately: blocking real patients is worse than letting spam
through, which validation and the spam flag still catch.

## Before first deploy

1. Resolve every launch blocker — run `npm run build` to list them.
2. Israeli legal review of the advertising posture, accessibility statement
   and privacy policy.
3. Create the `appointment_requests` table with RLS denying public reads;
   the endpoint is insert-only. Columns include `status`
   (`new` | `spam_suspected`) and `spam_signal` — filter the clinic's lead
   view on `status = 'new'` and triage the rest rather than discarding them.
4. Bind `RATE_LIMIT_KV` and set both secrets (above), then `npx wrangler types`.
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
