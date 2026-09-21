#!/usr/bin/env node
/**
 * MEDICAL CLAIMS LINTER
 *
 * Encodes תקנות רופאי השיניים (פרסומת אסורה), תשס"ט-2009 — the Israeli
 * Prohibited Advertising Regulations for dentists — as a mechanical check.
 *
 * The regulations forbid advertising that guarantees treatment success,
 * publishes prices or promotions, praises the dentist's professional skill,
 * claims unrecognised specialist titles, or publishes success statistics
 * without Ministry of Health approval. Violation is a criminal offence and
 * the dentist remains responsible even when an agency wrote the copy.
 *
 * This linter cannot make the site lawful — only an Israeli lawyer can sign
 * that off. What it does is stop the most common violations from being
 * introduced silently by a future edit.
 *
 * Usage:  node scripts/lint-claims.mjs
 * Exit 1 on any ERROR. WARN findings print but do not fail.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN_DIRS = ['src/content', 'src/i18n', 'src/components', 'src/pages'];
const SCAN_EXT = new Set(['.md', '.mdx', '.ts', '.astro', '.json']);

/** severity: 'error' fails the build, 'warn' requires counsel review. */
const RULES = [
  {
    id: 'guarantee',
    severity: 'error',
    why: 'Reg. 3 — guaranteeing treatment success is prohibited.',
    patterns: [
      /\bguarantee(d|s)?\b/i,
      /\bwe promise\b/i,
      /\bensures? (a )?(perfect|great|beautiful)\b/i,
      /מובטח/,
      /אחריות מלאה/,
      /בהבטחה/,
      /مضمون/,
      /نضمن/,
    ],
  },
  {
    id: 'painless',
    severity: 'error',
    why: 'Pain-level promises are unsupported outcome claims.',
    patterns: [/\bpain-?free\b/i, /\bpainless\b/i, /\bno pain\b/i, /ללא כאב/, /נטול כאב/, /לא כואב/, /بدون ألم/, /دون ألم/],
  },
  {
    id: 'price-promo',
    severity: 'error',
    why: 'Reg. 3 — publishing tariffs, prices, discounts or promotions is prohibited.',
    patterns: [
      /\b(discount|promo(tion)?|special offer|sale)\b/i,
      /\d+\s*%\s*(off|discount)/i,
      /₪\s*\d/,
      /\bILS\s*\d/i,
      /מבצע/,
      /הנחה/,
      /במחיר/,
      /خصم/,
      /عرض خاص/,
      /بسعر/,
    ],
  },
  {
    id: 'urgency',
    severity: 'error',
    why: 'Manipulative urgency; also collides with the promotions ban.',
    patterns: [
      /\blimited time\b/i,
      /\bact now\b/i,
      /\bhurry\b/i,
      /\bwhile stocks last\b/i,
      /לתקופה מוגבלת/,
      /לזמן מוגבל/,
      /لفترة محدودة/,
    ],
  },
  {
    id: 'superlative',
    severity: 'error',
    why: 'Reg. 2 — advertising that praises the dentist’s skill or knowledge is prohibited.',
    patterns: [
      /\b(the )?best (dentist|clinic|treatment)\b/i,
      /\b(leading|top-rated|number one|#1) (dentist|clinic)\b/i,
      /הרופא הטוב ביותר/,
      /המרפאה הטובה ביותר/,
      /המוביל בתחום/,
      /الأفضل/,
      /الرائد/,
    ],
  },
  {
    id: 'unrecognised-specialty',
    severity: 'error',
    why: 'Implantology is NOT a recognised dental specialty in Israel. Use "performs", never "specialist".',
    patterns: [
      /\b(implant|cosmetic|aesthetic)\s+specialist\b/i,
      /\bspecialist in (implants|implantology|cosmetic dentistry)\b/i,
      /מומחה\s+(ל)?השתלות/,
      /מומחה\s+ל?אסתטיקה/,
      /أخصائي\s+(في\s+)?زراعة/,
    ],
  },
  {
    id: 'success-stats',
    severity: 'error',
    why: 'Numerical success data requires Ministry of Health approval.',
    patterns: [/\b\d{2,3}\s*%\s*success\b/i, /\bsuccess rate\b/i, /אחוזי הצלחה/, /שיעור הצלחה/, /نسبة نجاح/],
  },
  {
    id: 'patient-identity',
    severity: 'error',
    why: 'Reg. 2 — patient name, image, likeness or identifying information is prohibited, reportedly even with consent.',
    patterns: [
      /\b(testimonial|patient story|patient review)s?\b/i,
      /\bbefore\s*(&|and|\/)\s*after\b/i,
      /לפני\s*(ו)?אחרי/,
      /המלצות מטופלים/,
      /قبل وبعد/,
      /شهادات المرضى/,
    ],
  },
  {
    id: 'free-treatment',
    severity: 'warn',
    why: 'The price ban carves out free treatment, but this needs counsel sign-off before publishing.',
    patterns: [/\bfree (consultation|check|exam)\b/i, /בדיקה בחינם/, /ייעוץ חינם/, /فحص مجاني/, /استشارة مجانية/],
  },
];

/** Strip comments so documentation that *names* a banned phrase (to warn
 *  against it) does not trip the linter. */
function stripComments(source, ext) {
  if (ext === '.md' || ext === '.mdx') return source;
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(extname(full))) out.push(full);
  }
  return out;
}

const findings = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const ext = extname(file);
    const raw = readFileSync(file, 'utf8');
    const text = stripComments(raw, ext);
    const lines = text.split('\n');

    for (const rule of RULES) {
      for (const pattern of rule.patterns) {
        lines.forEach((line, i) => {
          const m = line.match(pattern);
          if (m) {
            findings.push({
              file: relative(ROOT, file),
              line: i + 1,
              rule: rule.id,
              severity: rule.severity,
              why: rule.why,
              match: m[0].trim().slice(0, 60),
            });
          }
        });
      }
    }
  }
}

const errors = findings.filter((f) => f.severity === 'error');
const warns = findings.filter((f) => f.severity === 'warn');

const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const GRN = '\x1b[32m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

if (findings.length === 0) {
  console.log(`${GRN}✓ claims linter: no prohibited advertising patterns found.${OFF}`);
  process.exit(0);
}

for (const group of [
  { list: errors, color: RED, label: 'ERROR' },
  { list: warns, color: YEL, label: 'WARN ' },
]) {
  for (const f of group.list) {
    console.log(
      `${group.color}${group.label}${OFF} ${f.file}:${f.line}  ${group.color}${f.rule}${OFF} — "${f.match}"\n` +
        `      ${DIM}${f.why}${OFF}`,
    );
  }
}

console.log(
  `\n${errors.length} error(s), ${warns.length} warning(s).` +
    `\n${DIM}This check is a safety net, not legal advice. Israeli counsel must review final copy.${OFF}`,
);

process.exit(errors.length > 0 ? 1 : 0);
