/**
 * Appointment-request email relay.
 *
 * These tests exist because this code path is the one that already failed
 * once in production and cost the clinic every enquiry for days. The failure
 * was silent: the form said "sent" and nothing was. So most of what is
 * asserted here is about FAILURE behaviour, not the happy path.
 *
 * Run: npm test
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import worker, { composeEmail, type Env } from '../../workers/appointment-email/src/index.ts';
import { clinic, hasRequestEndpoint } from '../../src/data/clinic.ts';

const env: Env = {
  RESEND_API_KEY: 'test-key',
  MAIL_FROM: 'Dr. Khalil Kanani <request@drkhalilkanani.com>',
  MAIL_TO: 'clinic@example.test',
  ALLOWED_ORIGIN: 'https://www.drkhalilkanani.com',
};

const validBody = {
  name: 'ראמי',
  phone: '052-2885179',
  contactMethod: 'WhatsApp',
  treatment: 'סתימות',
  daypart: 'אחר הצהריים',
  message: 'כואבת לי שן כבר יומיים',
  locale: 'he',
  elapsedMs: 20000,
};

/** A POST as the browser would make it. */
function post(body: unknown, origin = env.ALLOWED_ORIGIN) {
  return new Request('https://relay.test/', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Replace global fetch for one call, recording what the Worker sent. */
async function withStubbedResend(
  ok: boolean,
  run: () => Promise<Response>,
): Promise<{ response: Response; sent: any }> {
  const original = globalThis.fetch;
  let sent: any = null;
  globalThis.fetch = (async (url: any, init: any) => {
    sent = { url: String(url), init, body: JSON.parse(init.body) };
    return new Response(ok ? '{"id":"x"}' : 'provider exploded', { status: ok ? 200 : 500 });
  }) as typeof fetch;
  try {
    return { response: await run(), sent };
  } finally {
    globalThis.fetch = original;
  }
}

describe('email composition', () => {
  test('carries every field the patient entered', () => {
    const { text } = composeEmail(validBody as any);
    // The whole point of the feature: the dentist gets what was typed.
    for (const value of ['ראמי', '052-2885179', 'WhatsApp', 'סתימות', 'אחר הצהריים']) {
      assert.ok(text.includes(value), `missing "${value}" from the email body`);
    }
    assert.ok(text.includes('כואבת לי שן כבר יומיים'), 'the free-text message must survive');
  });

  test('the phone number is in the subject line', () => {
    // So the request is actionable from a phone notification without opening
    // the mail — a dentist between patients will not open it.
    const { subject } = composeEmail(validBody as any);
    assert.match(subject, /052-2885179/);
    assert.match(subject, /ראמי/);
  });

  test('an empty optional field is omitted, not printed blank', () => {
    const { text } = composeEmail({ ...validBody, message: '', daypart: '' } as any);
    assert.ok(!/Preferred time:\s*$/m.test(text));
    assert.ok(!text.includes('Message from the patient'));
  });

  test('tells the dentist not to reply to the address', () => {
    // request@ is send-only. A reply into a void is worse than no address.
    const { text } = composeEmail(validBody as any);
    assert.match(text, /does not receive replies/i);
  });
});

describe('relay behaviour', () => {
  test('a valid request is sent and reported as ok', async () => {
    const { response, sent } = await withStubbedResend(true, () =>
      worker.fetch(post(validBody), env),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(sent.url, 'https://api.resend.com/emails');
    assert.equal(sent.body.from, env.MAIL_FROM);
    assert.deepEqual(sent.body.to, [env.MAIL_TO]);
  });

  test('a provider failure returns an error, never a false success', async () => {
    // THE important test. A 200 here would show the patient "sent" for a
    // request that does not exist, which is exactly the bug that already
    // happened. It must fail loudly so the form falls back to WhatsApp.
    const { response } = await withStubbedResend(false, () => worker.fetch(post(validBody), env));
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok: false, error: 'send_failed' });
  });

  test('a foreign origin is refused server-side', async () => {
    // CORS headers only restrain browsers. This check is the real one.
    const { response, sent } = await withStubbedResend(true, () =>
      worker.fetch(post(validBody, 'https://evil.example'), env),
    );
    assert.equal(response.status, 403);
    assert.equal(sent, null, 'nothing may be sent for a rejected origin');
  });

  test('GET is refused', async () => {
    const response = await worker.fetch(
      new Request('https://relay.test/', { method: 'GET', headers: { Origin: env.ALLOWED_ORIGIN } }),
      env,
    );
    assert.equal(response.status, 405);
  });

  test('a filled honeypot is silently dropped, not delivered', async () => {
    const { response, sent } = await withStubbedResend(true, () =>
      worker.fetch(post({ ...validBody, company: 'Acme SEO' }), env),
    );
    // 200 so the bot learns nothing...
    assert.equal(response.status, 200);
    // ...but no mail is actually sent.
    assert.equal(sent, null);
  });

  test('a submit faster than a human could type is dropped', async () => {
    const { response, sent } = await withStubbedResend(true, () =>
      worker.fetch(post({ ...validBody, elapsedMs: 400 }), env),
    );
    assert.equal(response.status, 200);
    assert.equal(sent, null);
  });

  test('an invalid phone number is rejected', async () => {
    const { response, sent } = await withStubbedResend(true, () =>
      worker.fetch(post({ ...validBody, phone: '12345' }), env),
    );
    assert.equal(response.status, 400);
    assert.equal(sent, null);
  });

  test('control characters cannot be smuggled into the mail', async () => {
    // Header injection: a newline in a field must not survive into the body
    // as a separate line the dentist could misread as our own text.
    const { sent } = await withStubbedResend(true, () =>
      worker.fetch(post({ ...validBody, name: 'Rami\r\nBcc: attacker@evil.test' }), env),
    );
    assert.ok(!/\r|\n/.test(sent.body.subject), 'no newline may reach the subject');
    assert.ok(!sent.body.text.includes('\nBcc:'), 'no forged header line in the body');
  });

  test('malformed JSON is rejected', async () => {
    const response = await worker.fetch(
      new Request('https://relay.test/', {
        method: 'POST',
        headers: { Origin: env.ALLOWED_ORIGIN, 'Content-Type': 'application/json' },
        body: 'not json',
      }),
      env,
    );
    assert.equal(response.status, 400);
  });
});

describe('recipient and sender cannot be influenced by the browser', () => {
  test('a client-supplied "to" is ignored — the env value is used', async () => {
    // An open relay is the worst outcome here: the clinic's verified sending
    // domain used to mail arbitrary strangers. The Worker reads ONLY env for
    // the recipient, never the payload.
    const { sent } = await withStubbedResend(true, () =>
      worker.fetch(post({ ...validBody, to: 'attacker@evil.test', MAIL_TO: 'attacker@evil.test' } as any), env),
    );
    assert.deepEqual(sent.body.to, [env.MAIL_TO]);
    assert.ok(!JSON.stringify(sent.body).includes('attacker@evil.test'));
  });

  test('a client-supplied "from" is ignored — the env value is used', async () => {
    const { sent } = await withStubbedResend(true, () =>
      worker.fetch(post({ ...validBody, from: 'spoof@evil.test', MAIL_FROM: 'spoof@evil.test' } as any), env),
    );
    assert.equal(sent.body.from, env.MAIL_FROM);
    assert.ok(!JSON.stringify(sent.body).includes('spoof@evil.test'));
  });

  test('unknown payload keys never reach the provider', async () => {
    const { sent } = await withStubbedResend(true, () =>
      worker.fetch(post({ ...validBody, cc: 'x@evil.test', bcc: 'y@evil.test', reply_to: 'z@evil.test' } as any), env),
    );
    for (const key of ['cc', 'bcc', 'reply_to']) {
      assert.ok(!(key in sent.body), `${key} must not be forwarded`);
    }
  });
});

describe('email content', () => {
  test('renders both a plain-text and an HTML part', async () => {
    const { sent } = await withStubbedResend(true, () => worker.fetch(post(validBody), env));
    assert.ok(sent.body.text.length > 0, 'a text part is required for notification previews');
    assert.ok(sent.body.html.includes('<html'), 'an HTML part is required');
  });

  test('HTML is escaped — a name cannot inject markup', () => {
    const { html } = composeEmail({ ...validBody, name: 'Rami <script>alert(1)</script>' } as any);
    assert.ok(html.includes('&lt;script&gt;'), 'markup must be escaped');
    assert.ok(!html.includes('<script>alert'), 'raw script must not survive');
  });

  test('Hebrew, Arabic and English survive intact in both parts', () => {
    for (const [locale, name, note] of [
      ['he', 'ראמי', 'כואבת לי שן'],
      ['ar', 'رامي', 'أشعر بألم في سن'],
      ['en', 'Rami', 'I have a sore tooth'],
    ] as const) {
      const { text, html } = composeEmail({ ...validBody, locale, name, message: note } as any);
      assert.ok(text.includes(name) && text.includes(note), `${locale}: lost in the text part`);
      assert.ok(html.includes(name) && html.includes(note), `${locale}: lost in the HTML part`);
    }
  });

  test('names the website language in words, not a code', () => {
    assert.ok(composeEmail({ ...validBody, locale: 'ar' } as any).text.includes('Arabic'));
    assert.ok(composeEmail({ ...validBody, locale: 'he' } as any).text.includes('Hebrew'));
  });

  test('records whether consent was ticked rather than assuming it', () => {
    assert.match(composeEmail({ ...validBody, consent: true } as any).text, /Consent given:\s*\nYes/);
    assert.match(composeEmail({ ...validBody, consent: false } as any).text, /Consent given:\s*\nNot recorded/);
  });

  test('carries a submission timestamp', () => {
    assert.match(composeEmail(validBody as any).text, /Submitted:/);
  });

  test('invents no field the form does not collect', () => {
    // The form has no e-mail or date input. A row for either would be an
    // email that lies about what the patient supplied.
    const { text } = composeEmail(validBody as any);
    assert.ok(!/^Email:/m.test(text), 'the form collects no e-mail address');
    assert.ok(!/^Preferred date:/m.test(text), 'the form collects no date');
  });

  test('the subject carries no clinical detail', () => {
    // Subject lines surface on lock screens. Name and phone are necessary to
    // act on; the treatment and the patient's message are not.
    const { subject } = composeEmail(validBody as any);
    assert.ok(!subject.includes(validBody.treatment), 'treatment must stay out of the subject');
    assert.ok(!subject.includes(validBody.message), 'the message must stay out of the subject');
  });

  test('an oversized message is truncated, not forwarded whole', async () => {
    const { response, sent } = await withStubbedResend(true, () =>
      worker.fetch(post({ ...validBody, message: 'x'.repeat(50000) }), env),
    );
    assert.equal(response.status, 200);
    assert.ok(sent.body.text.length < 12000, 'field length cap must apply');
  });
});

describe('site wiring', () => {
  test('the relay endpoint is configured, HTTPS, and not a placeholder', () => {
    // The relay is deployed and verified end to end, so the form now emails
    // first. Plain HTTP would send patient details in clear text.
    assert.equal(hasRequestEndpoint(), true);
    assert.match(clinic.requestEndpoint, /^https:\/\//, 'the endpoint must be HTTPS');
    assert.ok(
      !/example|localhost|TODO|changeme/i.test(clinic.requestEndpoint),
      'the endpoint must not be a placeholder',
    );
  });

  test('the form does not advertise WhatsApp as the delivery channel', async () => {
    // Regression guard. The relay shipped while every string still said
    // "Send on WhatsApp" / "WhatsApp opened / press send", so the form emailed
    // the request and then told the patient to go press send somewhere else.
    // A patient following that instruction would think nothing was submitted.
    const ui = await readFile(new URL('../../src/i18n/ui.ts', import.meta.url), 'utf8');
    const line = (key: string) =>
      [...ui.matchAll(new RegExp(`'${key}':\\s*'([^']*)'`, 'g'))].map((m) => m[1]);

    const WHATSAPP = /whatsapp|וואטסאפ|واتساب/i;
    for (const key of ['form.submit', 'form.submitting', 'form.intro', 'form.success.title', 'form.success.body']) {
      const values = line(key);
      assert.ok(values.length >= 3, `${key}: expected all three locales`);
      for (const value of values) {
        assert.doesNotMatch(value, WHATSAPP, `${key} still names WhatsApp: "${value}"`);
      }
    }
    // The fallback wording must still exist — it is correct for that path.
    for (const key of ['form.success.waTitle', 'form.success.waBody']) {
      assert.equal(line(key).length, 3, `${key}: fallback wording missing`);
    }
  });

  test('the success panel states which channel actually delivered', async () => {
    const src = await readFile(
      new URL('../../src/components/islands/AppointmentForm.astro', import.meta.url),
      'utf8',
    );
    assert.match(src, /showSuccess\(via: 'email' \| 'whatsapp'\)/, 'success must be told the path');
    assert.match(src, /showSuccess\('email'\)/, 'the relay path must report email');
    assert.equal(
      [...src.matchAll(/showSuccess\('whatsapp'\)/g)].length,
      2,
      'both fallback branches must report WhatsApp',
    );
  });

  test('the destination inbox is never exposed to the browser', () => {
    // requestEndpoint ships in the page source. It must address the relay and
    // nothing else -- the recipient stays a Worker secret.
    assert.ok(
      !/@/.test(clinic.requestEndpoint),
      'no email address may appear in the client-visible endpoint',
    );
  });

  test('an unset endpoint means WhatsApp, never a dropped request', async () => {
    // The regression guard. If someone rewrites the submit handler so that a
    // missing endpoint short-circuits, this catches it.
    const src = await readFile(
      new URL('../../src/components/islands/AppointmentForm.astro', import.meta.url),
      'utf8',
    );
    assert.match(src, /if \(!endpoint\) \{\s*\n\s*if \(handOffToWhatsApp\(\)\) showSuccess\('whatsapp'\);/);
  });

  test('a duplicate submission cannot be fired by a double click', async () => {
    // Disabling the button alone is not enough: two submit events can dispatch
    // before the first handler runs, and the dentist gets the request twice.
    const src = await readFile(
      new URL('../../src/components/islands/AppointmentForm.astro', import.meta.url),
      'utf8',
    );
    assert.match(src, /let submitting = false/);
    assert.match(src, /if \(submitting\) return;/);
    assert.match(src, /submitting = true;/);
  });

  test('a relay failure falls back to WhatsApp', async () => {
    const src = await readFile(
      new URL('../../src/components/islands/AppointmentForm.astro', import.meta.url),
      'utf8',
    );
    // The .catch branch must hand off, not merely show an error.
    assert.match(src, /\.catch\(\(\) => \{[\s\S]*?handOffToWhatsApp\(\)/);
  });

  test('no API key is committed anywhere in the worker directory', async () => {
    const toml = await readFile(
      new URL('../../workers/appointment-email/wrangler.toml', import.meta.url),
      'utf8',
    );
    assert.ok(!/RESEND_API_KEY\s*=/.test(toml), 'the key must be a wrangler secret, never a var');
    assert.ok(!/re_[A-Za-z0-9]{10,}/.test(toml), 'no Resend key literal');
  });

  test('the destination inbox is a secret, not a committed var', async () => {
    // This repository is PUBLIC. MAIL_TO is the doctor's personal address:
    // not a credential, but scraped and spammed within days if committed,
    // and impossible to take back. It is set with `wrangler secret put`.
    const toml = await readFile(
      new URL('../../workers/appointment-email/wrangler.toml', import.meta.url),
      'utf8',
    );
    assert.ok(!/^\s*MAIL_TO\s*=/m.test(toml), 'MAIL_TO must not be a [vars] entry');
  });

  test('no personal inbox address is committed anywhere in the repo', async () => {
    // A blunt guard against the obvious future mistake: someone pastes the
    // real address into the config or a doc "just to make it work".
    //
    // request@ on the clinic's own domain is deliberately allowed — it is a
    // send-only role address and belongs in a reviewable diff.
    const { execFileSync } = await import('node:child_process');
    const root = new URL('../../', import.meta.url).pathname;
    const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter((f) => /\.(ts|js|mjs|astro|md|toml|json|ya?ml)$/.test(f));

    const PERSONAL = /[A-Za-z0-9._%+-]+@(gmail|googlemail|hotmail|outlook|yahoo|walla|icloud)\.[a-z.]{2,}/i;
    const offenders: string[] = [];

    for (const file of tracked) {
      const body = await readFile(new URL(file, new URL('../../', import.meta.url)), 'utf8').catch(() => '');
      const hit = body.match(PERSONAL);
      // The test file itself contains the pattern by necessity.
      if (hit && !file.endsWith('appointment-email.test.ts')) offenders.push(`${file}: ${hit[0]}`);
    }

    assert.deepEqual(offenders, [], `personal email address committed:\n${offenders.join('\n')}`);
  });
});
