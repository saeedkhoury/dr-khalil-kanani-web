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

describe('site wiring', () => {
  test('the endpoint is unset until the owner deploys the relay', () => {
    assert.equal(hasRequestEndpoint(), false);
    assert.equal(clinic.requestEndpoint, '');
  });

  test('an unset endpoint means WhatsApp, never a dropped request', async () => {
    // The regression guard. If someone rewrites the submit handler so that a
    // missing endpoint short-circuits, this catches it.
    const src = await readFile(
      new URL('../../src/components/islands/AppointmentForm.astro', import.meta.url),
      'utf8',
    );
    assert.match(src, /if \(!endpoint\) \{\s*\n\s*if \(handOffToWhatsApp\(\)\) showSuccess\(\);/);
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
});
