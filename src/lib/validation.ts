/**
 * Shared validation contract.
 *
 * The SAME schema runs in the browser and on the server. Client validation is
 * a convenience; the server never trusts it.
 *
 * Field selection is deliberately minimal (docs/PRIVACY.md):
 *  · No ת.ז., no date of birth, no health fund, no uploads.
 *  · The free-text note is OPTIONAL, capped, and labelled "do not include
 *    medical details". A field inviting clinical detail would turn the lead
 *    store into one holding *especially sensitive* medical information under
 *    Amendment 13 and escalate its required security tier.
 *  · Treatment options carry non-clinical labels for the same reason.
 */

import { z } from 'zod';

// Phone helpers live in a zero-dependency module so the client-side form
// script can import them WITHOUT dragging zod into the browser bundle.
import { IL_PHONE, normalisePhone } from './phone';

export { normalisePhone };

export const CONTACT_METHODS = ['phone', 'whatsapp'] as const;
export const DAYPARTS = ['morning', 'afternoon', 'evening', 'any'] as const;

export const appointmentRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),

  phone: z
    .string()
    .trim()
    .transform(normalisePhone)
    .refine((v) => IL_PHONE.test(v), { message: 'invalid_phone' }),

  contactMethod: z.enum(CONTACT_METHODS),

  /** Shared English slug, or '' for "not sure". */
  treatment: z
    .string()
    .regex(/^[a-z0-9-]*$/)
    .max(60)
    .optional()
    .default(''),

  daypart: z.enum(DAYPARTS).optional().default('any'),

  /** Optional, capped. Never required — see file header. */
  message: z.string().trim().max(500).optional().default(''),

  /** Must be explicitly true. Silence is not consent (PPA Consent Opinion). */
  consent: z.literal(true),

  /** Separate, active opt-in. Passive opt-out is insufficient for marketing. */
  marketingOptIn: z.boolean().optional().default(false),

  locale: z.enum(['he', 'ar', 'en']),
  sourcePath: z.string().max(300).optional().default(''),

  /**
   * Honeypot. Named non-semantically on purpose: a field called "company"
   * is a prime target for password-manager autofill, which would flag real
   * patients. Presence is a SIGNAL only — see the endpoint; it never drops
   * the submission.
   */
  hp_check: z.string().optional().default(''),
  elapsedMs: z.coerce.number().int().nonnegative().optional().default(0),
});

export type AppointmentRequest = z.infer<typeof appointmentRequestSchema>;

/** Submissions faster than this are bots, not people. */
export const MIN_FILL_MS = 3000;
