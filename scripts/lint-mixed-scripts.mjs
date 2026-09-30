#!/usr/bin/env node
/**
 * MIXED-SCRIPT CONTAMINATION LINTER
 *
 * Catches homoglyphs from the wrong writing system inside Hebrew or Arabic
 * text — most commonly Cyrillic characters that look identical to Arabic or
 * Latin ones and survive copy-paste, transliteration tools and machine
 * translation.
 *
 * This is not hypothetical: during authoring, a Cyrillic "к" (U+043A) had
 * slipped into the Arabic word "يمكن". It renders almost identically, breaks
 * search and screen-reader pronunciation, and is invisible in review.
 *
 * Usage: node scripts/lint-mixed-scripts.mjs
 * Exit 1 if any contamination is found.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN_DIRS = ['src'];
const SCAN_EXT = new Set(['.md', '.mdx', '.ts', '.tsx', '.astro', '.json']);

// The SAME rule the admin Worker applies to every CMS write (readJson), so the
// CMS can never commit text this linter will refuse. Defined once:
import { FORBIDDEN_RANGES, SUSPECT_INVISIBLES } from '../src/lib/text-hygiene.ts';

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(extname(full))) out.push(full);
  }
  return out;
}

const findings = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const lines = readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, i) => {
      for (const [index, char] of [...line].entries()) {
        const code = char.codePointAt(0);

        for (const range of FORBIDDEN_RANGES) {
          if (range.test(code)) {
            findings.push({
              file: relative(ROOT, file),
              line: i + 1,
              col: index + 1,
              issue: `${range.name} character U+${code.toString(16).toUpperCase().padStart(4, '0')} "${char}"`,
              context: line.trim().slice(0, 70),
            });
          }
        }

        if (SUSPECT_INVISIBLES.has(code)) {
          findings.push({
            file: relative(ROOT, file),
            line: i + 1,
            col: index + 1,
            issue: `invisible ${SUSPECT_INVISIBLES.get(code)} (U+${code.toString(16).toUpperCase()})`,
            context: line.trim().slice(0, 70),
          });
        }
      }
    });
  }
}

const RED = '\x1b[31m';
const GRN = '\x1b[32m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

if (findings.length === 0) {
  console.log(`${GRN}✓ mixed-script linter: no contamination found.${OFF}`);
  process.exit(0);
}

for (const f of findings) {
  console.log(`${RED}ERROR${OFF} ${f.file}:${f.line}:${f.col}  ${f.issue}\n      ${DIM}${f.context}${OFF}`);
}
console.log(`\n${findings.length} issue(s).`);
process.exit(1);
