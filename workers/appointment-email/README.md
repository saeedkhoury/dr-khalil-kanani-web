# Appointment-request email relay

Sends the appointment form to the clinic inbox as email, from
`request@drkhalilkanani.com`.

The website is static and cannot send mail. This Worker is the one piece that
can. It is deployed separately from the site and is not part of `npm run build`.

**Until it is deployed and `requestEndpoint` is set in `src/data/clinic.ts`,
the form keeps using the WhatsApp handoff.** Nothing breaks while this is
pending, and nothing is lost.

---

## What you need before starting

| | Why | Cost |
|---|---|---|
| A Cloudflare account | Hosts the Worker | Free tier is ample (100k requests/day) |
| A Resend account | Actually delivers the mail | Free tier: 3,000 emails/month, 100/day |
| DNS access to `drkhalilkanani.com` | To prove you own the sending domain | — |
| A real inbox for `MAIL_TO` | Where requests land | — |

`MAIL_TO` is set as a secret, not committed — see step 2.

A clinic receiving a few requests a day sits inside both free tiers with room
to spare.

## 1. Verify the sending domain in Resend

In Resend → **Domains** → add `drkhalilkanani.com`. Resend gives you three
records to add at your DNS provider:

- a **DKIM** `TXT` record
- an **SPF** `TXT` record
- a **DMARC** `TXT` record (recommended, sometimes optional)

Add them, then press Verify. This usually takes minutes but DNS can take up to
an hour.

> **This step is not optional.** Without it, mail claiming to come from
> `request@drkhalilkanani.com` gets rejected or lands in spam — which is
> indistinguishable from the form being broken, and is exactly the failure
> this project has already had once.

`request@drkhalilkanani.com` does **not** need to be a real mailbox. It is a
send-only From address. Replies to it go nowhere, which is why the email body
says to reply by phone or WhatsApp instead. If you would rather it receive
replies, create the mailbox with your email provider separately.

## 2. Configure and deploy

```bash
cd workers/appointment-email
npm install -g wrangler
wrangler login
```

Set both secrets. Neither goes in a file, because this repository is public:

```bash
wrangler secret put RESEND_API_KEY   # paste the Resend API key
wrangler secret put MAIL_TO          # paste the doctor's inbox address
```

`MAIL_TO` is not a credential, but it is a personal email address. Committed to
a public repo it would be scraped and spammed within days, and there is no way
to take it back. Keeping it as a secret costs nothing and avoids that.

Deploy:

```bash
wrangler deploy
```

Wrangler prints the Worker URL, e.g.
`https://drkanani-appointment-email.<your-subdomain>.workers.dev`.

## 3. Point the website at it

In `src/data/clinic.ts`:

```ts
requestEndpoint: 'https://drkanani-appointment-email.<your-subdomain>.workers.dev',
```

Rebuild and deploy the site. The form now emails, and falls back to WhatsApp
if the Worker is unreachable.

## 4. Test it end to end

Submit a real request from the live site and confirm it arrives. Then check
the failure path, because that is the one nobody tests:

```bash
# Wrong origin must be refused
curl -i -X POST https://<worker-url> \
  -H 'Origin: https://evil.example' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","phone":"0522885179"}'
# expect 403 forbidden_origin
```

Note that `Origin` is a forbidden header name in browsers — `fetch()` silently
replaces a spoofed value — so this check can only be tested with curl or
another non-browser client. A browser-based "test" of it proves nothing. This
repository has been caught by that before.

## Rate limiting

The Worker itself does not rate limit: Workers are ephemeral, so an in-memory
counter would reset constantly and give false assurance. Do it at the edge
instead, where it actually works.

Cloudflare dashboard → **Security** → **WAF** → **Rate limiting rules**:

- Match: the Worker's hostname and path
- Threshold: 5 requests per minute per IP is generous for a dental clinic
- Action: Block

The honeypot and the 3-second minimum fill time are in the Worker and catch
naive bots without this. The WAF rule is what catches a determined one.

## What this does not store

Nothing. No database, no queue, no log of message bodies. The request is
formatted, sent and forgotten. Delivery failures log a status code and the
provider's reason — not patient data.

The patient's details do pass through Cloudflare and Resend in transit. Both
are processors under Amendment 13; if the clinic's privacy policy enumerates
processors, they belong on that list. This is a factual note, not legal advice
— the standing legal-review item covers it.
