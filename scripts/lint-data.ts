#!/usr/bin/env node --experimental-strip-types
/**
 * DATA SCHEMA LINTER — `npm run lint:data`
 *
 * Validates the JSON data files the admin CMS writes, using the SAME
 * functions the build uses (src/lib/data-schema.ts). There is deliberately no
 * second copy of the rules here: CI and the build disagreeing about what is
 * valid is worse than neither checking at all, because the pipeline stays
 * green while the site is wrong.
 *
 * The build already fails on a bad file. This exists so the failure has a
 * NAME. `npm run verify` reporting "lint:data failed: row 3 opens must be
 * HH:MM" is actionable; the same problem surfacing as a stack trace from
 * inside `astro build` is not.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertHoursShape, DataShapeError } from '../src/lib/data-schema.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const RED = '\x1b[31m';
const GRN = '\x1b[32m';
const OFF = '\x1b[0m';

interface Check {
  path: string;
  /** Throws DataShapeError on invalid data. */
  assert: (value: unknown, source: string) => unknown;
  describe: (value: unknown) => string;
}

const CHECKS: Check[] = [
  {
    path: 'src/data/hours.json',
    assert: assertHoursShape,
    describe: (v) => `${(v as unknown[]).length} days`,
  },
];

let failed = 0;

for (const check of CHECKS) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(join(ROOT, check.path), 'utf8'));
  } catch (error) {
    failed += 1;
    const why = error instanceof Error ? error.message : String(error);
    console.error(`${RED}✗ ${check.path}${OFF}\n    could not be read as JSON: ${why}\n`);
    continue;
  }

  try {
    check.assert(parsed, check.path);
    console.log(`${GRN}✓ ${check.path} — ${check.describe(parsed)}${OFF}`);
  } catch (error) {
    failed += 1;
    if (error instanceof DataShapeError) console.error(`${RED}${error.message}${OFF}`);
    else throw error;
  }
}

if (failed > 0) {
  console.error(`${RED}✗ lint:data: ${failed} file(s) invalid.${OFF}`);
  process.exit(1);
}
