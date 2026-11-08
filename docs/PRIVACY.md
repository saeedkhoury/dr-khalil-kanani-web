# Privacy architecture

Amendment 13 to the Protection of Privacy Law, 1981 — in force **14 Aug 2025**.

## What the site stores: nothing — but the request does travel

The form POSTs to the appointment-email Worker (Cloudflare), which stores
nothing and hands the request to Resend, which delivers it to the clinic
inbox. If the relay is unreachable the form falls back to a WhatsApp message
the visitor sends themselves (ADR 0007).

No database means no registration question and no security tier for the
site itself. The processors still have to be named: the inline notice and
the privacy policy list Cloudflare, Resend, the clinic mailbox and, on
fallback, WhatsApp, and say some of them process data outside Israel.

Until 2026-11-08 the inline notice still described the WhatsApp-only flow
("does not send them to a server") and the policy described an encrypted
lead database with 12-month deletion. Neither was true. Any change to the
submit path must update `privacy.notice.body` and `src/data/legal.ts` in the
same commit.

**Open owner decisions:** which mailbox `MAIL_TO` is (its provider is a
recipient too), and how long enquiries are kept there. The policy names no
period until the clinic chooses one.

## What is entered

Name, phone, preferred contact method, and optionally treatment of interest,
preferred daypart and a free-text note.

**Deliberately not collected:** ID number (ת.ז.), date of birth, health fund,
email (optional at most), file uploads, medical history.

## Why the note field is capped and labelled

A field inviting "describe your problem" collects things like *"abscess, and
I'm diabetic"*. That converts the lead store into one holding **especially
sensitive** medical information under Amendment 13 and escalates it to the
medium security tier under the 2017 Data Security Regulations.

The field is therefore optional, capped at 500 characters, and labelled
*"please do not include medical details — we will discuss treatment by phone"*.

## Registration and DPO

No database registration duty (thresholds: 10,000+ for brokers, 100,000+ for
the notification duty). No DPO. **Registration ≠ obligation** — notice, purpose
limitation, security, access/rectification and breach reporting all still apply.

## Consent

Per the PPA's final Consent Opinion (25 Feb 2026):

- Silence is not consent. The box is **unticked** and required.
- Marketing is a **separate active opt-in**. Passive opt-out is insufficient.
- Consent is documented: `consent_notice_version` is stored with every record
  so the clinic can show *what* a person was shown when they consented.

The s.11 notice renders **inline beside the submit button**, not behind a link,
and states: provision is voluntary, the consequence of refusing, the purpose,
recipients, the controller's contact details, and the right to access/correct.

## Messaging

Transactional and marketing paths are physically separate. Adding a promotion
to an appointment reminder converts it into a דבר פרסומת under Amendment 40 —
₪1,000 per message, no proof of harm required.

## Analytics and cookies

None today: no analytics, no cookies, no pixels (see the cookie policy,
`src/data/site-policies.ts`). The only browser storage is the accessibility
panel's localStorage. Google content loads only on click. If analytics is
ever added: cookieless only. Israel has **no ePrivacy-equivalent cookie law**, and the
PPA's Consent Opinion contains zero mentions of cookies. Shipping cookieless
analytics makes the banner question moot. Never Google Analytics or Meta Pixel.

## Retention

The website and the relay store nothing. Enquiries live in the clinic
mailbox / WhatsApp; the policy promises only "as long as needed" until the
clinic sets a period. Retention of an actual
patient's record is governed by the Patient's Rights Law, 1996 and the clinic's
own systems — a separate regime the site does not touch.

WhatsApp message history is held in the clinic's WhatsApp account, which is
outside this site's control and should be covered by the clinic's own
procedures.

## GDPR

Does not apply. No EU establishment, no targeting indicators. Do not build
DSAR portals or an EU representative.
