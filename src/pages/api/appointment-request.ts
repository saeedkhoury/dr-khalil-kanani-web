import type { APIRoute } from 'astro';
import { appointmentRequestSchema, MIN_FILL_MS } from '../../lib/validation';
import { deliver, isDeliveryConfigured, type SubmissionStatus } from '../../lib/delivery';
import { checkRateLimit } from '../../lib/rate-limit';

/** Server-rendered: this route must not be prerendered. */
export const prerender = false;

/**
 * Appointment request endpoint.
 *
 * Order of checks:
 *   1. same-origin      — CSRF; rejects cross-site form posts
 *   2. parse            — malformed body
 *   3. spam signals     — honeypot + time-to-submit, recorded NOT enforced
 *   4. rate limit       — bounds volume
 *   5. schema           — server-side, never trusts the client
 *   6. deliver          — durable store, flagged if a spam signal fired
 *
 * ── WHY SPAM SIGNALS DO NOT DROP THE SUBMISSION ───────────────────────────
 * This endpoint used to return a fake `{ok:true}` when the honeypot was
 * filled or the form was submitted quickly. Password managers routinely
 * autofill hidden fields, and a returning patient can legitimately submit in
 * under three seconds — so a real person in pain would see "request sent",
 * and nobody at the clinic would ever see it. For a medical practice a lost
 * enquiry is far more costly than a junk row.
 *
 * Signals now mark the record `spam_suspected` and it is still stored, so the
 * clinic can triage. The response shape is unchanged, so a bot still learns
 * nothing from it.
 *
 * Responses never echo submitted values and never reveal whether a given
 * phone number already exists.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/**
 * CSRF: second layer.
 *
 * Astro's built-in `security.checkOrigin` (default: true) ALREADY rejects
 * cross-site form POSTs to this route — verified with curl:
 *   `Origin: https://evil.example.com` -> 403 "Cross-site POST form
 *   submissions are forbidden", emitted by Astro before this handler runs.
 *
 * (Note for anyone re-testing: you cannot verify this from `fetch()` in the
 * browser. `Origin` is a forbidden header name, so the browser silently
 * replaces a spoofed value with the real one and the request looks
 * same-origin. Test with curl or another non-browser client.)
 *
 * This check is therefore defence-in-depth, not the primary control: it keeps
 * the route protected if `checkOrigin` is ever disabled or the adapter's
 * behaviour changes. It is deliberately no stricter than Astro's own check.
 */
function isSameOrigin(request: Request, siteUrl: URL): boolean {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).origin === siteUrl.origin;
    } catch {
      return false;
    }
  }
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin' || fetchSite === 'none';
  // No Origin and no Sec-Fetch-Site: not a modern browser cross-site post.
  return true;
}

/** Rate-limit key. The IP is hashed so no raw address is written anywhere. */
async function ipKey(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`arq:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  // 1. Same-origin.
  if (!isSameOrigin(request, url)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  // 2. Parse.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  const raw = Object.fromEntries(form.entries());

  // 3. Spam signals — recorded, not enforced. See the note above.
  const signals: string[] = [];
  if (typeof raw.hp_check === 'string' && raw.hp_check.trim() !== '') signals.push('honeypot');

  const elapsed = Number(raw.elapsedMs ?? 0);
  if (Number.isFinite(elapsed) && elapsed > 0 && elapsed < MIN_FILL_MS) signals.push('fast_submit');

  // 4. Rate limit.
  const ip = clientAddress ?? request.headers.get('cf-connecting-ip') ?? 'unknown';
  const limit = await checkRateLimit(await ipKey(ip));
  if (!limit.allowed) {
    return json({ ok: false, error: 'rate_limited' }, 429);
  }

  // 5. Validate. Coerce checkbox values to booleans first.
  const candidate = {
    ...raw,
    consent: raw.consent === 'true' || raw.consent === 'on',
    marketingOptIn: raw.marketingOptIn === 'true' || raw.marketingOptIn === 'on',
  };

  const parsed = appointmentRequestSchema.safeParse(candidate);
  if (!parsed.success) {
    // Field names only — never echo submitted values back.
    return json(
      { ok: false, error: 'validation', fields: parsed.error.issues.map((i) => i.path.join('.')) },
      422,
    );
  }

  // 6. Deliver.
  if (!(await isDeliveryConfigured())) {
    // Fail loudly rather than silently discarding a real patient enquiry.
    console.error('[appointment-request] delivery is not configured; request was NOT stored');
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  const status: SubmissionStatus = signals.length > 0 ? 'spam_suspected' : 'new';

  try {
    await deliver(parsed.data, status, signals.join(',') || undefined);
  } catch (error) {
    console.error('[appointment-request] delivery failed', error);
    return json({ ok: false, error: 'delivery_failed' }, 502);
  }

  return json({ ok: true });
};

/** Anything other than POST is not allowed here. */
export const ALL: APIRoute = () => json({ ok: false, error: 'method_not_allowed' }, 405);
