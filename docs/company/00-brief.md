# Project Brief: Dr. Khalil Kanani — dental clinic website

**Status:** draft for owner approval · 2026-11-24 · Track: **Existing project**
(Client site). Built from what the repository already records
(`docs/product/PRD.md`, ADRs, `HANDOFF.md`, live checks). Items marked
**OPEN** are not in the repo and must come from the owner; nothing here is
invented to fill them.

- **One-liner:** a trilingual (Hebrew / Arabic / English) website that turns
  local searches into phone calls, WhatsApp messages and appointment requests
  for one dental clinic in Jadeidi-Makr, Northern District, Israel.
- **Project type(s):** **Web** (content site, static, Astro on GitHub Pages) +
  **System** (two Cloudflare Workers: the Edit Mode admin CMS and the
  appointment email relay).
- **Problem:** the clinic had no meaningful web presence; patients searching
  in three languages found little or wrong information (PRD §1).
- **Goal (3 months):** **OPEN — needs a number from the owner.** Candidates,
  with today's baseline: Search Console clicks per month (baseline 5 clicks /
  38 impressions over 3 months to 2026-09-28); appointment requests per month
  (no count recorded yet); Business Profile calls / direction requests per
  month. · **Failure looks like:** the site is live but brings no contacts.
- **Users:** local patients and families, on phones, in he / ar / en. ·
  **Buyer:** the clinic. · **Editor:** the doctor, through Edit Mode.
- **Core value (v1 must-do):** contact the clinic in one tap on a phone
  (call, WhatsApp, or the request form).
- **Must-have:** the nine "Must" items in `docs/product/PRD.md` §4 (trilingual
  RTL/LTR, factual doctor and treatments, easy mobile contact, appointment
  *requests*, WCAG 2.1 AA, Israeli dental advertising rules, Privacy Law,
  fast on mobile, maintainable by one developer).
- **Later:** `planning/ROADMAP.md` (Tier-2 treatments, photography, ar/en
  logo lockups, citations, educational content).
- **Out of scope:** real-time booking, patient portal, payments, prices,
  promotions, reviews and testimonials, before/after galleries (the last
  three are prohibited, ADR 0005/0006), IP or language auto-redirects.
- **Business model:** none online. The site is the clinic's acquisition
  channel; nothing is sold on it and prices may not be advertised.
- **Data:** appointment requests (contact details and request text) are
  emailed to the clinic inbox through Resend; the site stores nothing, sets
  no cookies and runs no analytics. Health-related personal data → handled
  under the Israeli Protection of Privacy Law. Retention period: **OPEN**
  (owner/lawyer, see HANDOFF).
- **Platforms and devices:** mobile-first web (375 px), all modern browsers;
  no app. · **Languages and regions:** he (default, RTL), ar (RTL), en (LTR);
  Israel.
- **Integrations:** WhatsApp click-to-chat, Google Maps / Waze (click to
  load), Resend, Cloudflare Access, IndexNow, Search Console.
- **Existing assets:** live domain and site, clinic mark SVG, full Hebrew
  logo (`src/assets/brand/logo-full.jpg`, PR #33), Instagram work photos
  (ADR 0009/0010), Business Profile.
- **Constraints:** deadline **none (live site, continuous)** · budget
  **OPEN** — current running cost appears to be free tiers (GitHub, Cloudflare
  Workers, Resend) plus the domain; owner to confirm a monthly ceiling ·
  team: one developer with Claude; the doctor edits content · tech: Astro,
  Tailwind, static hosting, no database (ADR 0001, 0004, 0012).
- **Priorities:** legal safety and correctness > accessibility and mobile
  speed > new features (from AGENTS.md §3). Owner to confirm.
- **Must never happen:** an invented fact, a prohibited medical claim, a
  patient image or before/after published, a lost appointment request, a
  broken RTL page, a privacy leak.
- **Top risks:** (1) the 10 published treatment-work photos — prohibited-
  advertising risk pending legal review (ADR 0010); (2) unverified facts
  shipped under `ACK_UNVERIFIED` (doctor.ar, tagline.ar; doctor.en owner-confirmed 2026-11-24);
  (3) five high-severity advisories in build dependencies (fix available).
- **References:** Apple design language (PR #29); not like the two
  competitor clinic sites studied in discovery (inconsistent phone numbers,
  wrong map links — docs/engineering/ARCHITECTURE.md).
- **Assumptions (accepted defaults, change any):** Fable off; main session on
  Sonnet; native spec mode with spec-kit for large features; alerts as GitHub
  issues (no paging).
- **Open questions:** 3-month goal number (owner, next review) · monthly
  budget ceiling (owner) · enquiry retention period and `MAIL_TO` mailbox
  (owner + lawyer) · legal review of policies and the treatment-work photos
  (lawyer) · whether to set `ADMIN_PREVIEW` so Edit Mode rebuilds itself
  (owner, needs a Cloudflare token).
- **Coverage:** 13 critical items: 11 answered from repository records,
  2 open (goal number, budget). Needs owner approval.
