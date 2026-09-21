/**
 * Appointment form option constants.
 *
 * This was `lib/validation.ts` and held a Zod schema for the server endpoint.
 * That endpoint is gone (ADR 0007 — the form now hands off to WhatsApp), so
 * the schema had no consumer and the file is now what it actually is: the
 * shared list of form choices.
 *
 * Phone validation lives in `lib/phone.ts`, which is deliberately
 * zero-dependency so the client script can import it without pulling Zod
 * into the browser.
 *
 * Treatment options carry non-clinical labels: a field inviting clinical
 * detail would turn an ordinary enquiry into especially-sensitive medical
 * information. See docs/PRIVACY.md.
 */

export const CONTACT_METHODS = ['phone', 'whatsapp'] as const;
export const DAYPARTS = ['morning', 'afternoon', 'evening', 'any'] as const;

export type ContactMethod = (typeof CONTACT_METHODS)[number];
export type Daypart = (typeof DAYPARTS)[number];
