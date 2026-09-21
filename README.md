# Dr. Khalil Kanani — dental clinic website

Trilingual (Hebrew / Arabic / English) site for a dental clinic in
Jadeidi-Makr, Northern District, Israel.

## Quick start

```bash
npm install
npm run build:preview   # VERIFY_RELAX=1 — needed until clinic facts are verified
npm run dev
```

`npm run build` (without `VERIFY_RELAX`) **will fail** until the owner has
verified the outstanding clinic facts. That is intentional — see
[HANDOFF.md](./HANDOFF.md).

## Read before changing anything

| File | What it is |
|---|---|
| [AGENTS.md](./AGENTS.md) | Engineering rules. Start here. |
| [CLAUDE.md](./CLAUDE.md) | Claude Code workflow |
| [HANDOFF.md](./HANDOFF.md) | Actual current state and blockers |
| [docs/](./docs/) | Architecture, i18n, SEO, privacy, security, design system |
| [docs/decisions/](./docs/decisions/) | Why things are the way they are |

## Two things that will surprise you

1. **The build refuses to run in production** while any clinic fact is
   unverified. This is a feature. Run `npm run build` to see the list.
2. **There is no reviews section and no before/after gallery.** Both are
   prohibited for Israeli dentists — see ADR 0005 and 0006. Do not add them.

## Commands

```bash
npm run dev            # dev server, :4321
npm run build          # production build, enforces the launch gate
npm run build:preview  # local preview with the gate relaxed
npm run verify         # claims + mixed-script linters + type check
```
