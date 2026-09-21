# Current plan

**Approved:** 2026-09-20 · **Phase:** 1–5 complete, gated on owner verification

## Done

| Phase | Scope | State |
|---|---|---|
| 0 | Research + architecture | ✅ |
| 1 | Repo, gates, tokens, `clinic.ts` | ✅ |
| 2 | Design system + i18n foundation | ✅ |
| 3 | Core pages, all three locales | ✅ |
| 4 | 6 Tier-1 treatments × 3 locales | ✅ |
| 5 | Appointment request flow + endpoint | ✅ |

## Blocked — needs the owner, not code

Production build is **refused** until these resolve. `npm run build` lists them.

1. Exact street address + verified map pin
2. Opening hours
3. Domain name
4. Canonical Arabic spelling and Latin transliteration of the doctor's name
5. Native Arabic review of the tagline
6. Credentials (none verifiable were found anywhere)
7. Accessibility contact name / phone / email
8. Israeli legal review of claims posture, accessibility statement, privacy policy

## Next, once unblocked

- Phase 6: Tier-2 treatments (crowns, fillings, extractions, cleaning);
  clinic photography
- Phase 7: CSP, KV binding, Supabase table + RLS, cookieless analytics
- Phase 8: Playwright suite covering the manual matrix in `docs/TESTING.md`
- Phase 9: Deploy, then GBP + Waze + health-fund directory + citations

## Parallelisable

Tier-2 content authoring splits cleanly by locale (disjoint directories).
Phase 7 review passes are read-only and can run concurrently.
