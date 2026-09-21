# ADR 0007 — Appointment requests hand off to WhatsApp

**Status:** Accepted · 2026-09-21
**Supersedes:** [ADR 0003](./0003-appointment-request-delivery.md)

## Context

The site was deployed to **GitHub Pages** at `www.drkhalilkanani.com`. GitHub
Pages serves static files only.

ADR 0003 had chosen a server endpoint writing to Supabase, built against the
Cloudflare adapter. That adapter splits the build into `dist/client` and
`dist/server`; the deploy workflow uploads `dist/client`. The endpoint in
`dist/server` was therefore **never deployed**.

Measured on the live site:

```
POST https://www.drkhalilkanani.com/api/appointment-request/  →  405
```

The form posted to a path that does not exist. **Every appointment request
submitted on the live site was lost**, with no error surfaced to the clinic.
The owner noticed before we did.

## Decision

The form composes the entered details into a **WhatsApp message** addressed to
the clinic's verified mobile (`052-2885179`, confirmed by two independent
sources) and hands off to `wa.me`. No server, no database, no third party.

The Cloudflare adapter is removed and the site is fully static, so what is
built is exactly what is served.

## Why WhatsApp rather than the alternatives

| Option | Works on GitHub Pages | Needs | Verdict |
|---|---|---|---|
| **WhatsApp handoff** | ✅ | Nothing — number already verified | ✅ Chosen |
| Third-party form service | ✅ | Clinic email (unknown) + a third party | Breaks the zero-third-party posture the privacy design rests on |
| Keep the server endpoint | ❌ | Moving hosts to Cloudflare | Correct long-term, not available today |
| `mailto:` link | ⚠️ | A configured mail client | Unreliable on mobile |

WhatsApp is also the dominant contact channel in Israel, so this is not merely
the available option — it is likely the highest-converting one.

## Consequences

**Good**

- Requests reach the dentist directly and immediately.
- Nothing is stored by the site, so the Amendment 13 database duties fall away
  entirely: no retention policy, no deletion path, no consent-version record,
  no security tier to maintain.
- The privacy notice can now state plainly what happens, instead of describing
  a server that does not exist.
- One fewer moving part that can silently break.

**Bad, and accepted**

- **No audit trail.** If a patient does not press send in WhatsApp, the clinic
  never sees the enquiry. A server endpoint would have captured the attempt.
- **No after-hours queue** beyond what WhatsApp itself provides.
- Marketing opt-in was removed — there is no list to add anyone to and no
  store to record consent in, so asking would have been theatre.

**Mitigations in place**

- Client-side validation still runs before handoff, so malformed requests are
  caught early.
- A `<noscript>` block offers call and WhatsApp directly.
- If a popup blocker intercepts `window.open`, the page navigates in place
  rather than leaving a dead button.

## Revisit when

The clinic moves to a host that can run server code (Cloudflare Pages is one
line of config away — the adapter integration is in git history at `93c09f5~1`).
At that point the server endpoint can return **alongside** the WhatsApp path,
giving both an audit trail and the fast channel.

## Lesson recorded

The bug was not in the code — the endpoint was correct and tested. It was a
**mismatch between the build target and the deploy target**, and nothing in the
pipeline checked that the thing the form posts to actually exists in what gets
uploaded. Deploy-time verification of the live contact path is now an
acceptance criterion, not an assumption.
