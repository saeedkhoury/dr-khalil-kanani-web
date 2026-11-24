## Summary

<!-- What changes for a visitor, the doctor in Edit Mode, or the pipeline? One to three bullets. -->

## Checks (AGENTS.md §11)

- [ ] No invented clinic fact (hours, credentials, prices, addresses) — owner-confirmed or left unrendered
- [ ] No medical outcome claim — `npm run lint:claims` passes
- [ ] Media opened and registered in `src/data/media.ts`, staged by path (never `git add -A`)
- [ ] RTL safe: logical CSS only, `.u-ltr` around Latin runs in he/ar
- [ ] Checked `/he/`, `/ar/`, `/en/` at 375px and desktop; heading order has no skips
- [ ] Tests added or updated for new behaviour (`npm test`); e2e does not pin editable content
- [ ] `HANDOFF.md` updated; `BUILD-STATE.md` backlog ticked if this closes an item

## Test plan

- [ ] CI: verify · security · build-preview green
- [ ] <manual check, if any>

## Screenshots (UI changes)

| he | ar | en |
|---|---|---|
|  |  |  |
