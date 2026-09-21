# Privacy architecture

Amendment 13 to the Protection of Privacy Law, 1981 — in force **14 Aug 2025**.

## What is collected

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

## Analytics

Cookieless only. Israel has **no ePrivacy-equivalent cookie law**, and the
PPA's Consent Opinion contains zero mentions of cookies. Shipping cookieless
analytics makes the banner question moot. Never Google Analytics or Meta Pixel.

## Retention

Unconverted leads: deleted at **12 months**, automated. Converted leads migrate
to the clinical system (Patient's Rights Law, 1996 — a separate regime) and are
purged from the web store.

**Email is not the system of record** — you cannot reliably delete from
inboxes, forwarded threads and backups, which would make both the retention
policy and any deletion request undeliverable.

## GDPR

Does not apply. No EU establishment, no targeting indicators. Do not build
DSAR portals or an EU representative.
