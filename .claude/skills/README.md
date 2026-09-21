# Skill registry

Project-specific skills. Three exist because three things here are genuinely
non-obvious and genuinely expensive to get wrong. General engineering knowledge
belongs in [AGENTS.md](../../AGENTS.md), not in a skill.

| Skill | Use when |
|---|---|
| `dental-content` | Writing or editing ANY patient-facing copy |
| `multilingual-ui` | Building or changing UI that renders in he/ar/en |
| `design-system` | Choosing colours, type, spacing or motion |

## Deliberately not created

| Not built | Why |
|---|---|
| `frontend` | That is AGENTS.md §5 |
| `testing` | `docs/TESTING.md` + `npm run verify` cover it |
| `seo` | `docs/SEO.md` is reference, not a workflow |
| `security-review` | The global `security-reviewer` agent covers it |
| `forms`, `release`, `accessibility` | Add when a phase actually needs them |

A skill that restates a doc is worse than no skill — it creates a second place
to drift.
