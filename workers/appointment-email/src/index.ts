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
  /** Whether the patient ticked the consent box. Recorded, never assumed. */
  consent?: boolean;
  /**
   * Honeypot — must be empty. Real people cannot see this field.
   *
   * Deliberately NOT called "company", "website" or anything else a browser
   * recognises: Chrome ignores autocomplete="off" on standard address-form
   * names and will happily autofill them, which silently discarded a real
   * patient's request.
   */
  hp_ref2?: string;
  /** Milliseconds the form was on screen before submit. */
  elapsedMs?: number;
}

const MAX_FIELD = 2000;
/**
 * Minimum time on screen before a submit is treated as a bot.
 *
 * Was 3000ms, which a browser autofilling every field beats easily — and the
 * request was then dropped while the patient was shown success. For a clinic
 * receiving a handful of requests a day, ONE lost patient costs more than a
 * hundred spam emails, so this is now only tight enough to catch a script
 * posting instantly.
 */
const MIN_ELAPSED_MS = 1200;

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

/** Escapes text for the HTML part. Patient names are untrusted input. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Israel local time, so the dentist reads a timestamp that matches his day. */
function submittedAt(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date());
}

const LANGUAGE_NAME: Record<string, string> = { he: 'Hebrew', ar: 'Arabic', en: 'English' };

/**
 * The email the dentist actually reads.
 *
 * Sent as BOTH plain text and HTML. The text part is not a courtesy — it is
 * what renders in a notification preview, in a watch, and in any client that
 * blocks HTML, which is where a dentist between patients will actually see it.
 *
 * Only fields the form really collects appear. There is no e-mail address or
 * preferred-date row because the form does not ask for either; inventing them
 * would produce an email that quietly lies about what the patient supplied.
 */
export function composeEmail(p: RequestPayload): { subject: string; text: string; html: string } {
  const when = submittedAt();
  const rows: Array<[string, string]> = [
    ['Name', p.name],
    ['Phone', p.phone],
    ['Preferred contact', p.contactMethod],
    ['Requested treatment', p.treatment],
    ['Preferred time', p.daypart],
    ['Website language', LANGUAGE_NAME[p.locale] ?? p.locale],
    ['Consent given', p.consent ? 'Yes' : 'Not recorded'],
    ['Submitted', when],
  ];
  const present = rows.filter(([, value]) => value);

  const text = [
    'NEW APPOINTMENT REQUEST',
    '',
    ...present.map(([label, value]) => `${label}:\n${value}`),
    ...(p.message ? ['', `Message / Notes:\n${p.message}`] : []),
    '',
    '—',
    'Sent by drkhalilkanani.com. Reply by phone or WhatsApp; this address does not receive replies.',
  ].join('\n');

  // Inline styles only: every mail client strips <style> blocks. dir="auto"
  // lets each value render in its own script's direction, so a Hebrew name and
  // a Latin phone number both read correctly in one table.
  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f1f6fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f2a3d">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dbe6ef;border-radius:12px">
<tr><td style="padding:20px 24px;border-bottom:1px solid #dbe6ef">
<h1 style="margin:0;font-size:18px;color:#0c5283">New appointment request</h1>
</td></tr>
<tr><td style="padding:8px 24px 20px">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
${present
  .map(
    ([label, value]) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid #eef3f8;font-size:12px;color:#5b7186;text-transform:uppercase;letter-spacing:.04em;width:40%;vertical-align:top">${escapeHtml(
        label,
      )}</td><td style="padding:10px 0;border-bottom:1px solid #eef3f8;font-size:15px;color:#0f2a3d" dir="auto">${escapeHtml(value)}</td></tr>`,
  )
  .join('')}
${
  p.message
    ? `<tr><td colspan="2" style="padding:16px 0 0;font-size:12px;color:#5b7186;text-transform:uppercase;letter-spacing:.04em">Message / Notes</td></tr>
<tr><td colspan="2" style="padding:6px 0 0;font-size:15px;line-height:1.6;white-space:pre-wrap" dir="auto">${escapeHtml(
        p.message,
      )}</td></tr>`
    : ''
}
</table>
</td></tr>
<tr><td style="padding:14px 24px;background:#f7fafc;border-top:1px solid #dbe6ef;font-size:12px;color:#5b7186;border-radius:0 0 12px 12px">
Sent by drkhalilkanani.com. Reply by phone or WhatsApp; this address does not receive replies.
</td></tr>
</table>
</body></html>`;

  return {
    // The phone number goes in the subject so the request is actionable
    // straight from a phone notification. Nothing clinical goes here — the
    // treatment and the patient's message stay inside the body, because
    // subject lines surface on lock screens.
    subject: `New appointment request — ${p.name} (${p.phone})`,
    text,
    html,
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
    // Both checks answer 200 so a bot learns nothing. The danger is a FALSE
    // POSITIVE: a real patient silently discarded while being told "sent".
    // That happened -- Chrome autofilled a honeypot named "company" despite
    // autocomplete="off", and the request vanished with no trace.
    //
    // So every drop is now LOGGED. A dropped request must be explainable
    // after the fact; the previous version left nothing to look at.
    if (clean(payload.hp_ref2) !== '') {
      console.warn('dropped: honeypot filled', JSON.stringify({
        reason: 'honeypot',
        // No patient data -- just enough to tell autofill from a bot.
        hpLength: clean(payload.hp_ref2).length,
        elapsedMs: payload.elapsedMs ?? null,
        ua: request.headers.get('User-Agent')?.slice(0, 80) ?? null,
      }));
      return json(env, { ok: true }, 200);
    }
    if (typeof payload.elapsedMs === 'number' && payload.elapsedMs < MIN_ELAPSED_MS) {
      console.warn('dropped: submitted too fast', JSON.stringify({
        reason: 'timing',
        elapsedMs: payload.elapsedMs,
        thresholdMs: MIN_ELAPSED_MS,
        ua: request.headers.get('User-Agent')?.slice(0, 80) ?? null,
      }));
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
      consent: payload.consent === true,
    };

    if (cleaned.name.length < 2) {
      return json(env, { ok: false, error: 'invalid_name' }, 400);
    }
    if (!PHONE.test(cleaned.phone.replace(/[\s-]/g, ''))) {
      return json(env, { ok: false, error: 'invalid_phone' }, 400);
    }

    const { subject, text, html } = composeEmail(cleaned);

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
        html,
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
