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
import { assertClinicPhotographyShape, assertHoursShape, assertTreatmentWorkShape, DataShapeError } from '../src/lib/data-schema.ts';
import { parseManaged, servicesSchema, faqSchema, doctorProfileSchema, managedCopySchema, contactFactsSchema } from '../src/lib/managed-schema.ts';

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
  { path: 'src/data/services.json', assert: (v) => parseManaged(servicesSchema, v, 'services'), describe: () => 'valid structured content' },
  { path: 'src/data/general-faq.json', assert: (v) => parseManaged(faqSchema, v, 'general FAQ'), describe: () => 'valid structured content' },
  { path: 'src/data/doctor-profile.json', assert: (v) => parseManaged(doctorProfileSchema, v, 'doctor profile'), describe: () => 'valid structured content' },
  { path: 'src/data/managed-copy.json', assert: (v) => parseManaged(managedCopySchema, v, 'managed copy'), describe: () => 'valid structured content' },
  { path: 'src/data/contact-facts.json', assert: (v) => parseManaged(contactFactsSchema, v, 'contact facts'), describe: () => 'valid contact facts' },
  {
    path: 'src/data/hours.json',
    assert: assertHoursShape,
    describe: (v) => `${(v as unknown[]).length} days`,
  },
  {
    path: 'src/data/clinic-photography.json',
    assert: assertClinicPhotographyShape,
    describe: (v) => {
      const records = v as Array<{ status?: string }>;
      const published = records.filter((r) => r.status === 'published').length;
      return `${records.length} photograph(s), ${published} published`;
    },
  },
  {
    path: 'src/data/treatment-work.json',
    assert: assertTreatmentWorkShape,
    describe: (v) => {
      const records = v as Array<{ status?: string }>;
      const published = records.filter((r) => r.status === 'published').length;
      return `${records.length} doctor's-work image(s), ${published} published`;
    },
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
