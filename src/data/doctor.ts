/**
 * Doctor profile.
 *
 * ⚠ CREDENTIALS ARE DELIBERATELY EMPTY.
 *
 * Discovery found NO verifiable qualifications for Dr. Khalil Kanani in any
 * public source — not a dental school, graduation year, licence number,
 * memberships or years in practice. Inventing any of them would be inventing
 * facts about a real physician.
 *
 * `credentials` must be filled by the owner before launch. Until then the
 * UI renders only what is verified and simply omits the credentials block.
 *
 * Note for whoever fills this in: Israeli dental advertising regulations
 * prohibit advertising that praises the dentist's skill or knowledge, and
 * prohibit specialist titles that are not lawfully recognised. Israel
 * recognises eight dental specialties and IMPLANTOLOGY IS NOT ONE OF THEM —
 * write "performs implants", never "implant specialist" / "מומחה להשתלות".
 * State facts (degree, institution, year), never evaluations.
 */

import type { Locale } from '../i18n/config';
import profile from './doctor-profile.json' with { type: 'json' };
import { doctorProfileSchema, parseManaged } from '../lib/managed-schema.ts';

export interface Credential {
  /** Factual line only: degree, institution, year, membership. */
  label: Record<Locale, string>;
  year?: string;
}

/* The text is owner-editable JSON; this module keeps the established API. */
export const doctor = {
  /** Short factual introduction. Safe because it states only what is verified. */
  intro: parseManaged(doctorProfileSchema, profile, 'doctor profile').intro,

  /** How the clinic works. Operational description, not self-praise. */
  approach: parseManaged(doctorProfileSchema, profile, 'doctor profile').approach,

  /**
   * OWNER MUST SUPPLY. Example of the expected shape, intentionally empty:
   *
   *   { label: { he: 'בוגר רפואת שיניים, האוניברסיטה העברית', ar: '…', en: '…' }, year: '2014' }
   *
   * Do not populate with anything that has not been confirmed in writing.
   */
  credentials: parseManaged(doctorProfileSchema, profile, 'doctor profile').credentials as Credential[],

  /** Portrait. Owner must supply; no stock photo stands in for a real doctor. */
  portrait: null as string | null,
};

export function hasCredentials(): boolean {
  return doctor.credentials.length > 0;
}
