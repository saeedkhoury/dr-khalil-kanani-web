/**
 * MEDICAL CLAIMS RULES — THE ONE AUTHORITATIVE SET.
 *
 * Encodes תקנות רופאי השיניים (פרסומת אסורה), תשס"ט-2009 as a mechanical
 * check. It cannot make the site lawful — only an Israeli lawyer can sign
 * that off. What it does is stop the most common violations from being
 * introduced silently by a future edit.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 * The rules used to live inside scripts/lint-claims.mjs, which scans the
 * repository at build time. That was the only enforcement point, and it did
 * not cover src/data/ — so once the CMS let the clinic owner write
 * publishable text into clinic-photography.json, prohibited claims could
 * reach the live site past the control built to stop them.
 *
 * Both the CLI linter and the admin Worker now import THIS module. There is
 * one list. A second copy inside the Worker would drift, and a drifted
 * copy is worse than no copy: it would report "checked" while checking
 * something else.
 *
 * Contains no Node API and no Worker API, so it runs in both.
 */

export type Severity = 'error' | 'warn';

export interface ClaimRule {
  id: string;
  severity: Severity;
  /** What the rule protects against, in the reviewer's language. */
  why: string;
  patterns: RegExp[];
}

export interface ClaimFinding {
  rule: string;
  severity: Severity;
  why: string;
  /** The offending text, truncated — never the whole document. */
  match: string;
}

/** severity: 'error' fails the build, 'warn' requires counsel review. */
export const RULES: ClaimRule[] = [
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

/**
 * Every rule a piece of text violates.
 *
 * Used by the CLI linter line by line, and by the Worker on a whole field.
 * Returns findings rather than throwing so each caller can decide what to do
 * with a warning.
 */
export function findClaims(text: string): ClaimFinding[] {
  const findings: ClaimFinding[] = [];
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = pattern.exec(text);
      if (match) {
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          why: rule.why,
          match: match[0].trim().slice(0, 60),
        });
        // One finding per rule is enough to refuse; listing every occurrence
        // of the same violation only makes the message harder to act on.
        break;
      }
    }
  }
  return findings;
}

/** Findings that must block, as opposed to those needing counsel review. */
export function blockingClaims(text: string): ClaimFinding[] {
  return findClaims(text).filter((f) => f.severity === 'error');
}

/**
 * The doctor's-work descriptions ONLY (src/data/treatment-work.json).
 *
 * Those images are owner-directed clinic posts that are themselves labelled
 * "before" and "after" (ADR 0009, ADR 0010), and accurate alt text has to say
 * so. This removes exactly that plain descriptor — the three before/after
 * patterns of `patient-identity` — and nothing else, before the normal rules
 * run. Testimonials, patient stories, guarantees, success rates and every
 * other rule still apply to the same text. It says nothing about whether
 * publishing such images is lawful; that review remains open.
 */
const BEFORE_AFTER_DESCRIPTOR = [/\bbefore\s*(&|and|\/)\s*after\b/gi, /לפני\s*(ו)?אחרי/g, /قبل وبعد/g];
export function withoutBeforeAfterDescriptor(text: string): string {
  return BEFORE_AFTER_DESCRIPTOR.reduce((rest, pattern) => rest.replace(pattern, ' '), text);
}
