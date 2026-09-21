/**
 * Appointment-request relay — Cloudflare Worker.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * The website is static (GitHub Pages) and has no server. It cannot send
 * email. This Worker is the smallest thing that can: it accepts one POST from
 * the appointment form, formats it, and hands it to Resend for delivery to
 * the clinic inbox.
 *
 * It is deliberately NOT part of the Astro build. The site stays a pile of
 * static files that anyone can host anywhere; this is a separate, separately
 * deployed unit. If it is down, the form falls back to WhatsApp rather than
 * losing the request — that regression happened once already and cost the
 * clinic every enquiry for days (ADR 0007). Nothing about email delivery is
 * allowed to reintroduce it.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────
 * It stores nothing. No database, no log of message bodies, no queue. The
 * request is formatted, sent, and forgotten. That keeps the Amendment 13
 * position simple: the clinic's mail provider holds the data, exactly as it
 * would if the patient had emailed the clinic directly.
 *
 * Setup, DNS and secrets: see README.md in this directory.
 */

export interface Env {
  /** Resend API key. Set with `wrangler secret put RESEND_API_KEY`. Never committed. */
  RESEND_API_KEY: string;
  /** Verified sender, e.g. "Dr. Khalil Kanani <request@drkhalilkanani.com>". */
  MAIL_FROM: string;
  /** Where requests land — the clinic's real inbox. */
  MAIL_TO: string;
  /** Exact origin allowed to call this, e.g. "https://www.drkhalilkanani.com". */
  ALLOWED_ORIGIN: string;
}

/** Mirrors the form. Everything the patient typed, nothing more. */
interface RequestPayload {
  name: string;
  phone: string;
  contactMethod: string;
  treatment: string;
  daypart: string;
  message: string;
  locale: string;
  /** Honeypot — must be empty. Real people cannot see this field. */
  company?: string;
  /** Milliseconds the form was on screen before submit. */
  elapsedMs?: number;
}

const MAX_FIELD = 2000;
const MIN_ELAPSED_MS = 3000;

/**
 * Israeli mobile and landline.
 *
 * Deliberately duplicated from the client rather than shared: client-side
 * validation is a courtesy to the visitor, server-side validation is the
 * actual control. A shared module invites someone to eventually trust the
 * client's verdict and skip the check here.
 */
const PHONE = /^0(5\d|[2-4]|[8-9]|7\d)-?\d{7}$/;

/** Control characters, which could otherwise forge mail headers. */
const CONTROL_CHARS = /[\p{Cc}]/gu;

function cors(env: Env, extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    ...extra,
  };
}

const json = (env: Env, body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: cors(env, { 'Content-Type': 'application/json' }),
  });

/** Trim, cap length, and strip control characters. */
function clean(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS, ' ').trim().slice(0, MAX_FIELD);
}

/** The email the dentist actually reads. Plain text: it renders everywhere. */
export function composeEmail(p: RequestPayload): { subject: string; text: string } {
  const rows: Array<[string, string]> = [
    ['Name', p.name],
    ['Phone', p.phone],
    ['Preferred contact', p.contactMethod],
    ['Treatment', p.treatment],
    ['Preferred time', p.daypart],
    ['Site language', p.locale],
  ];

  const body = rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');

  const note = p.message ? `\n\nMessage from the patient:\n${p.message}` : '';

  return {
    // The phone number goes in the subject so the request is actionable
    // straight from a phone notification, without opening the mail.
    subject: `Appointment request — ${p.name} (${p.phone})`,
    text: `${body}${note}\n\n— Sent by drkhalilkanani.com. Reply by phone or WhatsApp; this address does not receive replies.`,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env) });
    }
    if (request.method !== 'POST') {
      return json(env, { ok: false, error: 'method_not_allowed' }, 405);
    }
    // Checked server-side. CORS headers only constrain browsers, and a
    // browser is not the only thing that can POST to a public URL.
    if (request.headers.get('Origin') !== env.ALLOWED_ORIGIN) {
      return json(env, { ok: false, error: 'forbidden_origin' }, 403);
    }

    let payload: RequestPayload;
    try {
      payload = (await request.json()) as RequestPayload;
    } catch {
      return json(env, { ok: false, error: 'bad_json' }, 400);
    }

    // ── Spam defence ──────────────────────────────────────────────────────
    // These two return 200. Telling a bot which check it tripped only helps
    // it iterate, and the clinic loses nothing by the bot believing it won.
    //
    // A genuine failure below returns a real error code, because a PATIENT
    // must never be shown "sent" for a request that was not delivered. That
    // distinction is the whole point: silence is fine for bots, never for
    // people.
    if (clean(payload.company) !== '') {
      return json(env, { ok: true }, 200);
    }
    if (typeof payload.elapsedMs === 'number' && payload.elapsedMs < MIN_ELAPSED_MS) {
      return json(env, { ok: true }, 200);
    }

    const cleaned: RequestPayload = {
      name: clean(payload.name),
      phone: clean(payload.phone),
      contactMethod: clean(payload.contactMethod),
      treatment: clean(payload.treatment),
      daypart: clean(payload.daypart),
      message: clean(payload.message),
      locale: clean(payload.locale),
    };

    if (cleaned.name.length < 2) {
      return json(env, { ok: false, error: 'invalid_name' }, 400);
    }
    if (!PHONE.test(cleaned.phone.replace(/[\s-]/g, ''))) {
      return json(env, { ok: false, error: 'invalid_phone' }, 400);
    }

    const { subject, text } = composeEmail(cleaned);

    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [env.MAIL_TO],
        subject,
        text,
      }),
    });

    if (!sent.ok) {
      // The provider's reason must not reach the visitor, but it belongs in
      // the Worker log so a delivery failure is diagnosable rather than
      // mysterious.
      console.error('resend_failed', sent.status, await sent.text().catch(() => ''));
      // A real error, so the form falls back to WhatsApp instead of showing
      // success for a request that was never delivered.
      return json(env, { ok: false, error: 'send_failed' }, 502);
    }

    return json(env, { ok: true }, 200);
  },
};
