# CLAUDE.md

Claude Code operating instructions for this repository.
**Read [AGENTS.md](./AGENTS.md) first** — it holds the engineering rules. This
file only adds Claude-specific workflow.

## Before you change anything

1. `AGENTS.md` — rules, especially §3 (the two non-negotiables)
2. `HANDOFF.md` — what state the repo is actually in
3. `planning/CURRENT_PLAN.md` — the approved plan
4. Relevant `docs/`

## Commands

```bash
npm run dev            # dev server on :4321
npm run build          # production build — enforces the launch gate
npm run build:preview  # VERIFY_RELAX=1, local preview only, never CI
npm run verify         # claims + mixed-script linters + astro check
npm run lint:claims    # Israeli dental advertising regulations check
npm run lint:scripts   # Cyrillic/Greek homoglyphs in Hebrew/Arabic text
```

## The three things most likely to go wrong here

1. **Inventing a fact.** No credential, hour, address or price gets written
   without owner confirmation. If you need one to make a page look finished,
   leave the block unrendered instead — the components already handle empty.
2. **Introducing a medical claim.** Any adjective about outcomes is suspect.
   Run `npm run lint:claims` before you finish, and read AGENTS.md §3.2.
3. **Breaking RTL.** Never use physical CSS properties. Always `.u-ltr` around
   Latin runs inside Hebrew or Arabic.

## Verifying UI work

Use the browser to check real rendering, not just the build:

- All three locales — `/he/`, `/ar/`, `/en/`
- 375px and desktop
- axe-core, and confirm heading order has no skips (AA-mandatory in Israel)
- The sticky mobile bar must never cover footer content

## Subagents

Worth delegating: content authoring per locale (disjoint directories, genuinely
parallel), and independent review passes (SEO / a11y / security / performance —
all read-only).

Not worth delegating: component work that shares files.

## When you finish

Update `HANDOFF.md`. Add to `CHANGELOG.md` only if the change is notable.
