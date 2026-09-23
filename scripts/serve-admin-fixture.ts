#!/usr/bin/env node --experimental-strip-types
/**
 * LOCAL ADMIN PANEL FIXTURE — for browser tests only.
 *
 * Runs the REAL admin Worker over loopback so Playwright can exercise the
 * panel in a real browser: RTL at 375px, keyboard traversal, axe.
 *
 * ── THIS IS NOT AN AUTHENTICATION BYPASS ──────────────────────────────────
 * The Worker is unmodified and still requires a valid Cloudflare Access
 * assertion. A browser cannot set that header, so this harness mints a REAL
 * RS256 token with a locally generated key and injects it the way Cloudflare's
 * edge would, then serves the Worker a JWKS containing the matching public
 * key. Every signature, issuer, audience and expiry check runs exactly as in
 * production — only the key source differs, and nothing in the Worker knows
 * this file exists.
 *
 * ── IT CANNOT REACH ANYTHING REAL ─────────────────────────────────────────
 * GitHub is mocked in memory. The token is fake, the branch is fake, and no
 * request leaves the machine: any URL other than the JWKS or api.github.com
 * throws. It binds to 127.0.0.1 and refuses to start in production.
 */

import { createServer } from 'node:http';

import worker from '../workers/admin/src/index.ts';
import type { Env } from '../workers/admin/src/http.ts';
import {
  AUDIENCE, DOCTOR, TEAM_DOMAIN, jwksDocument, makeToken,
} from '../tests/helpers/access-jwt.ts';

if (process.env.NODE_ENV === 'production') {
  throw new Error('[admin fixture] refusing to run in production');
}

const PORT = 4332;

const env: Env = {
  ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
  ACCESS_AUD: AUDIENCE,
  ADMIN_ORIGIN: `http://127.0.0.1:${PORT}`,
  ALLOWED_EMAILS: DOCTOR,
  GITHUB_TOKEN: 'fixture-token-not-a-credential',
  CONTENT_BRANCH: 'fixture-branch',
};

/* ── In-memory repository ────────────────────────────────────────────────── */

const encode = (text: string) => Buffer.from(text, 'utf8').toString('base64');

const store = {
  hours: [
    { day: 'Sunday', opens: '09:00', closes: '18:00', closed: false },
    { day: 'Monday', opens: '09:00', closes: '18:00', closed: false },
    { day: 'Tuesday', opens: '09:00', closes: '18:00', closed: false },
    { day: 'Wednesday', opens: '09:00', closes: '18:00', closed: false },
    { day: 'Thursday', opens: '09:00', closes: '18:00', closed: false },
    { day: 'Friday', opens: '', closes: '', closed: true },
    { day: 'Saturday', opens: '', closes: '', closed: true },
  ],
  photos: [
    {
      file: 'reception-01.jpg', category: 'reception', width: 2400, height: 1600,
      status: 'published', alt: { he: 'אזור ההמתנה במרפאה', ar: 'منطقة الانتظار', en: 'Waiting area' },
    },
    {
      file: 'exterior-01.jpg', category: 'exterior', width: 2400, height: 1600,
      status: 'unpublished', alt: { he: 'חזית המרפאה', ar: 'واجهة العيادة', en: 'Clinic exterior' },
    },
  ],
};

let commits = 0;

/** Answer the GitHub Contents and Actions APIs from the store above. */
function mockGitHub(url: string, init?: RequestInit): Response {
  const method = init?.method ?? 'GET';
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  if (url.includes('/actions/runs')) {
    return json({ workflow_runs: [{ status: 'completed', conclusion: 'success', updated_at: new Date().toISOString() }] });
  }
  if (url.includes('/commits?')) {
    return json([{ sha: 'a'.repeat(40), commit: { message: 'cms(hours): update opening hours', author: { date: new Date().toISOString() } } }]);
  }

  if (method === 'PUT' || method === 'DELETE') {
    const body = JSON.parse(String(init?.body ?? '{}')) as { content?: string };
    if (url.includes('hours.json') && body.content) {
      store.hours = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
    }
    if (url.includes('clinic-photography.json') && body.content) {
      store.photos = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
    }
    commits += 1;
    return json({ commit: { sha: String(commits).padStart(40, 'f') } });
  }

  if (url.includes('hours.json')) {
    return json({ content: encode(`${JSON.stringify(store.hours, null, 2)}\n`), encoding: 'base64', sha: 'hours-sha' });
  }
  if (url.includes('clinic-photography.json')) {
    return json({ content: encode(`${JSON.stringify(store.photos, null, 2)}\n`), encoding: 'base64', sha: 'photos-sha' });
  }
  if (url.includes('/contents/src/assets/images/')) {
    return json({ content: encode('image'), encoding: 'base64', sha: 'image-sha' });
  }
  return json({ message: 'not found' }, 404);
}

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes('/cdn-cgi/access/certs')) {
    return new Response(JSON.stringify(jwksDocument), { status: 200 });
  }
  if (url.startsWith('https://api.github.com/')) return mockGitHub(url, init);
  throw new Error(`[admin fixture] blocked network access to ${url}`);
}) as typeof fetch;
void realFetch;

/* ── Loopback server ─────────────────────────────────────────────────────── */

const server = createServer((incoming, outgoing) => {
  const chunks: Buffer[] = [];
  incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
  incoming.on('end', () => {
    void (async () => {
      const token = await makeToken({ email: DOCTOR });
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (typeof value === 'string') headers.set(key, value);
      }
      // Injected exactly where Cloudflare Access would put it. The Worker
      // verifies it in full; nothing is skipped.
      headers.set('Cf-Access-Jwt-Assertion', token);

      const method = incoming.method ?? 'GET';
      const request = new Request(`http://127.0.0.1:${PORT}${incoming.url ?? '/'}`, {
        method,
        headers,
        ...(method === 'GET' || method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }),
      });

      const response = await worker.fetch(request, env);
      outgoing.statusCode = response.status;
      response.headers.forEach((value, key) => outgoing.setHeader(key, value));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    })().catch((error: unknown) => {
      outgoing.statusCode = 500;
      outgoing.end(String(error));
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[admin fixture] http://127.0.0.1:${PORT} — mocked GitHub, generated JWT, loopback only`);
});
