---
name: dental-content
description: Use when writing or editing any patient-facing copy for this clinic — treatment pages, FAQ, UI strings, meta descriptions. Encodes the Israeli dental advertising regulations that make certain claims a criminal matter.
---

# Dental content

## Purpose

Stop a prohibited medical claim from reaching a real dentist's website.
Israeli law makes this criminal liability, and the dentist remains responsible
even when an agency or an agent wrote the copy.

## When to use

Any change to: treatment content, FAQ answers, UI strings in `src/i18n/ui.ts`,
meta descriptions, the doctor bio, or legal page text.

## When NOT to use

Component structure, styling, routing, build config — nothing patient-facing.

## Inputs

- `AGENTS.md` §3.2 — the prohibition table
- `docs/CONTENT.md` — verification tiers and what is actually confirmed
- `src/data/clinic.ts` — the `VERIFICATION` manifest

## Workflow

1. **Check the tier before writing.** If the fact is not `verified` or `owner`
   in the manifest, do not write it. Leave the block unrendered — every
   component already handles empty.

2. **Write operational facts, never outcomes.** Describe what the clinic *does*,
   not what the patient *will get*.

   | Don't | Do |
   |---|---|
   | "precise aesthetic results" | "a full explanation before every treatment" |
   | "painless treatment" | (omit entirely) |
   | "treatment with a warranty" | "one dentist who knows your history" |
   | "perfect for you" | "considered for" |
   | "takes 45 minutes" | "the length varies between patients" |
   | "specialist in implants" | "performs implants" |

3. **Never write**: guarantees, pain claims, durations, success rates, prices,
   discounts, promotions, superlatives, patient names or images, or the word
   "מומחה" near implants or aesthetics (neither is a recognised Israeli
   specialty).

4. **Lean on the exemption.** Reg. 4 permits *"information focused on facts,
   whose purpose is the dissemination of knowledge and medical education"*.
   That is the one content strategy the regulations actively allow — and it
   also performs best for E-E-A-T and AI extraction. Write to it deliberately.

5. **Write all three locales together.** Locale parity is build-enforced.
   Arabic needs Levantine Palestinian register, not MSA-formal or Gulf
   vocabulary.

## Verification

```bash
npm run lint:claims    # prohibited advertising patterns
npm run lint:scripts   # Cyrillic/Greek homoglyphs in Hebrew/Arabic
npm run build          # locale parity
```

The claims linter is a **safety net, not legal advice**. It catches the common
patterns; it cannot judge a novel phrasing. When in doubt, flag it for counsel
rather than shipping it.

## Output

Content files in all three locales, linters green, and an explicit note in
your summary of any phrasing a lawyer should look at.
