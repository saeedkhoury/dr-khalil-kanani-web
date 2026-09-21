# Testing

## Required checks

```bash
npm run verify
npm test
npm run lint:assets -- --all
npm run build
npm run lint:a11y
npx playwright install chromium
npm run test:e2e
```

The bare production build refuses unconfirmed published facts. To reproduce
the **existing** production workflow without disabling its gate:

```bash
ASTRO_SITE=https://www.drkhalilkanani.com ACK_UNVERIFIED=doctor.ar,doctor.en,tagline.ar npm run build
```

This is an acknowledgement, not owner verification. Do not expand the list or
set `VERIFY_RELAX` in production. `npm run build:preview` is preview only.

## Automated coverage

- 76 unit tests: locales, contact helpers, launch gates, content/media rules,
  asset guard staging/CI regressions.
- Built-HTML audit: 41 pages, heading order, ids, alt, accessible names,
  language and direction.
- 19 Playwright tests in Chromium: 39 localized pages × 375, 768, 1440px;
  axe WCAG 2/2.1 A/AA, horizontal overflow, resource failures, console errors,
  zero third-party requests on load, mobile footer clearance.
- Root homepage and 404 axe checks.
- Native menus, equivalent-page language switching, invalid form submissions,
  consent and intercepted WhatsApp handoff, including popup-blocked fallback.
- No-JS contact fallback and visible content with reduced motion or failed
  IntersectionObserver initialization.
- Synthetic gallery, rating and map: opening/navigation/Escape/focus return,
  modal keyboard isolation, Western Arabic digits, and map privacy behavior.

Playwright owns preview servers on loopback ports 4330 and 4331. Build `dist/`
first. The second server builds an isolated OS temporary copy containing the
existing vector mark and synthetic data. It never writes fixture values into
the real source or production build. WhatsApp and Google navigation is
intercepted locally; no test message is sent.

Both GitHub workflows run the suite after a fresh build and HTML audit.
Failure traces/screenshots are retained as workflow artifacts for seven days.
Local reports are in gitignored `playwright-report/` and `test-results/`.

## Verification limits

The 2026-09-21 follow-up passed the checks above. Homepage/contact screenshot
samples were opened across all nine locale × width combinations. No approved
visual baseline exists, so visual regression status is inconclusive. No
physical-device, VoiceOver, outdoor contrast, native-language approval or live
map/rating confirmation is implied. See [QA-CHECKLIST.md](QA-CHECKLIST.md).

The site is static and requests hand off to WhatsApp (ADR 0007). There is no
appointment endpoint, database, rate limiter or server delivery path to test.
