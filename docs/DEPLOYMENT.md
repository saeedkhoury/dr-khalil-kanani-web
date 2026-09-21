# Deployment

## Production target

**GitHub Pages**, custom domain `www.drkhalilkanani.com`, via
`.github/workflows/deploy.yml` on push to `main`.

The site is fully static: no adapter, server endpoint, database, KV binding or
runtime secrets. The workflow uploads `dist/`. Appointment requests compose a
WhatsApp message for the visitor to review and send (ADR 0007).

## Gates

Production runs claims, script and asset linters, type checking, unit tests,
a strict build, the built-HTML accessibility audit and Chromium/axe browser
QA before deploying. Asset checks scan tracked files in CI.

The workflow sets `ASTRO_SITE=https://www.drkhalilkanani.com`, `ASTRO_BASE=/`
and the existing explicit `ACK_UNVERIFIED=doctor.ar,doctor.en,tagline.ar`
allowlist. These three fields remain unconfirmed; acknowledgement does not
promote them to verified. Any other unacknowledged published fact blocks the
build. Unconfirmed address, coordinates and hours remain hidden.

`VERIFY_RELAX=1` is only for local/PR previews. It is never set in the
production workflow. `npm run build` without the acknowledgement still
refuses the three unconfirmed published fields.

## Environment

| Variable | Purpose |
|---|---|
| `ASTRO_SITE` | Canonical production origin and sitemap origin |
| `ASTRO_BASE` | Hosting base path, `/` for the custom domain |
| `ACK_UNVERIFIED` | Explicit reviewed list of unconfirmed published fields |
| `VERIFY_RELAX` | Preview-only relaxation; forbidden in production |

No Supabase credentials are used. `.env.example` contains only optional local
build settings. Never put secrets or clinic data in public build variables.

## Pull requests

`.github/workflows/preview.yml` verifies, builds and tests the site, then uploads
`preview-site` as a downloadable artifact. It does not deploy to GitHub Pages.
Synthetic browser fixtures live in an OS temporary copy and are never included
in the uploaded site.

The unused Cloudflare Worker's Git connection was disconnected with owner
approval on 2026-09-21. It had no public URL or custom domain and lacked the
build environment required by the launch gate. Historical failed Workers
checks remain on older commits; new pushes use GitHub Pages only. Do not
reconnect it or add a Worker adapter without a deliberate hosting decision.

## After deployment

1. Confirm the production workflow succeeded for the intended `main` commit.
2. Verify `/he/`, `/ar/`, `/en/`, contact pages, sitemap, canonical URLs and
   self-hosted assets on the real domain.
3. Check phone/WhatsApp targets, form validation, responsive layout and axe.
   Intercept external handoffs for automated tests so no test enquiry is sent.
4. A human real-device check should confirm phone/WhatsApp app opening. Sending
   a real test enquiry to the clinic requires explicit authorization.
5. Keep owner verification, native-language and legal-review items open in
   `HANDOFF.md` until actually completed.

## Rollback

Revert the offending change on `main` and let the full gated workflow redeploy.
There is no website database to roll back. Do not return quarantined patient
media to the repository when selecting or reverting a historical commit.
