/**
 * Israeli phone helpers — ZERO DEPENDENCIES, deliberately.
 *
 * This module is imported by the client-side form script. It must never
 * import zod (or anything else), because doing so pulls the entire validation
 * library into the browser bundle: importing these two helpers from
 * lib/validation.ts cost 85KB of client JavaScript for one regex.
 *
 * lib/validation.ts imports FROM here, never the other way round.
 *
 *   landline  0X-XXXXXXX   (area codes 2, 3, 4, 8, 9)
 *   mobile    05X-XXXXXXX
 *   VoIP      07X-XXXXXXX
 */

export const IL_PHONE = /^(?:\+972|0)(?:[23489]\d{7}|5\d{8}|7\d{8})$/;

/** Strip separators so the pattern can be applied to what people actually type. */
export function normalisePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

export function isValidIsraeliPhone(raw: string): boolean {
  return IL_PHONE.test(normalisePhone(raw));
}
