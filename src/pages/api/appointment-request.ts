import type { APIRoute } from 'astro';
import { appointmentRequestSchema, MIN_FILL_MS } from '../../lib/validation';
import { deliver, isDeliveryConfigured } from '../../lib/delivery';
import { checkRateLimit } from '../../lib/rate-limit';

/** Server-rendered: this route must not be prerendered. */
export const prerender = false;

/**
 * Appointment request endpoint.
 *
 * Defence in depth, in order of cost:
 *   1. honeypot field         — free, catches naive bots
 *   2. time-to-submit         — free, catches scripted posts
 *   3. rate limit per IP      — cheap
 *   4. schema validation      — server-side, never trusts the client
 *   5. delivery               — durable store + notification
 *
 * The response never reflects user input back in HTML, and error messages
 * never leak whether a given phone number already exists.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  const raw = Object.fromEntries(form.entries());

  // 1. Honeypot. Respond 200 so bots learn nothing from the status code.
  if (typeof raw.company === 'string' && raw.company.trim() !== '') {
    return json({ ok: true });
  }

  // 2. Time-to-submit. A human cannot complete this form in under 3 seconds.
  const elapsed = Number(raw.elapsedMs ?? 0);
  if (Number.isFinite(elapsed) && elapsed > 0 && elapsed < MIN_FILL_MS) {
    return json({ ok: true });
  }

  // 3. Rate limit.
  const ip = clientAddress ?? request.headers.get('cf-connecting-ip') ?? 'unknown';
  const limit = await checkRateLimit(ip);
  if (!limit.allowed) {
    return json({ ok: false, error: 'rate_limited' }, 429);
  }

  // 4. Validate. Coerce checkbox values to booleans first.
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

  // 5. Deliver.
  if (!isDeliveryConfigured()) {
    // Fail loudly rather than silently discarding a real patient enquiry.
    console.error('[appointment-request] delivery is not configured; request was NOT stored');
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  try {
    await deliver(parsed.data);
  } catch (error) {
    console.error('[appointment-request] delivery failed', error);
    return json({ ok: false, error: 'delivery_failed' }, 502);
  }

  return json({ ok: true });
};

/** Anything other than POST is not allowed here. */
export const ALL: APIRoute = () => json({ ok: false, error: 'method_not_allowed' }, 405);
