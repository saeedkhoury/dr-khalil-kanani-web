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
import { readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import worker from '../workers/admin/src/index.ts';
import servicesData from '../src/data/services.json' with { type: 'json' };
import faqData from '../src/data/general-faq.json' with { type: 'json' };
import doctorData from '../src/data/doctor-profile.json' with { type: 'json' };
import copyData from '../src/data/managed-copy.json' with { type: 'json' };
import contactData from '../src/data/contact-facts.json' with { type: 'json' };
// The doctor's work: the REAL records' text and order, so the manager can be
// compared with the page — but every image byte is generated (see below).
import workData from '../src/data/treatment-work.json' with { type: 'json' };
import type { Env } from '../workers/admin/src/http.ts';
import {
  AUDIENCE, DOCTOR, TEAM_DOMAIN, jwksDocument, makeToken,
} from '../tests/helpers/access-jwt.ts';
import { solidJpeg } from '../tests/helpers/jpeg.ts';

if (process.env.NODE_ENV === 'production') {
  throw new Error('[admin fixture] refusing to run in production');
}

/*
 * --production runs a second instance whose content branch is 'main', so the
 * editor's production wording and its "Live" claim can be tested. "Live"
 * depends on the OFFICIAL site's build.txt, which is mocked here too and
 * changes only when a test POSTs /__fixture/publish — the public deploy.
 */
const PRODUCTION = process.argv.includes('--production');
const PORT = PRODUCTION ? 4333 : 4332;
const ASSET_ROOT = resolve(fileURLToPath(new URL('../workers/admin/dist/', import.meta.url)));

/*
 * "The rebuild has deployed", on demand. A browser test saves, then POSTs to
 * /__fixture/deploy (answered here, never by the Worker) to make the served
 * build contain the latest commit — exactly what the preview workflow does
 * for real. Until then there is no build.txt, as after a manual deploy.
 */
let lastCommit = '';
let deployedCommit: string | null = null;
let publicCommit: string | null = null;

function asset(request: Request): Response {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/build.txt') {
    return deployedCommit === null ? new Response('Not found', { status: 404 }) : new Response(`${deployedCommit}\n`);
  }
  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const path = resolve(join(ASSET_ROOT, relative.slice(1)));
  if (!path.startsWith(`${ASSET_ROOT}/`)) return new Response('Not found', { status: 404 });
  try {
    const ext = extname(path);
    const type = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : ext === '.woff2' ? 'font/woff2' : ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream';
    return new Response(readFileSync(path), { headers: { 'Content-Type': type } });
  } catch { return new Response('Not found', { status: 404 }); }
}

const env: Env = {
  ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
  ACCESS_AUD: AUDIENCE,
  ADMIN_ORIGIN: `http://127.0.0.1:${PORT}`,
  ALLOWED_EMAILS: DOCTOR,
  GITHUB_TOKEN: 'fixture-token-not-a-credential',
  CONTENT_BRANCH: PRODUCTION ? 'main' : 'fixture-branch',
  ASSETS: { fetch: async (request) => asset(request) },
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
  work: workData as Array<Record<string, unknown> & { file: string; width: number; height: number }>,
  services: servicesData,
  faq: faqData,
  doctor: doctorData,
  copy: copyData,
  contact: contactData,
};

const fileKinds: Record<string, keyof typeof store> = {
  'hours.json': 'hours', 'clinic-photography.json': 'photos', 'treatment-work.json': 'work',
  'services.json': 'services', 'general-faq.json': 'faq',
  'doctor-profile.json': 'doctor', 'managed-copy.json': 'copy',
  'contact-facts.json': 'contact',
};
const blobShas: Record<keyof typeof store, string> = {
  hours: '1'.repeat(40), photos: '2'.repeat(40), work: '8'.repeat(40), services: '3'.repeat(40),
  faq: '4'.repeat(40), doctor: '5'.repeat(40), copy: '6'.repeat(40), contact: '7'.repeat(40),
};

let commits = 0;

/*
 * Images are REAL bytes, and a file over 1 MB behaves the way GitHub's
 * Contents API really does: metadata and a SHA, no inline content, bytes only
 * through the raw media type. The earlier fixture answered every image with
 * the text "image" inline, which is how a Worker that failed on every real
 * photograph passed its browser tests.
 */
// A generated JPEG — never a site image, so the fixture holds no patient
// material and does not depend on content the doctor may delete.
const REAL_JPEG = solidJpeg(1600, 1200);
const images = new Map<string, { bytes: Uint8Array; sha: string }>([
  ...store.photos.map((record, i) => [record.file, { bytes: new Uint8Array(REAL_JPEG), sha: String(i + 1).padStart(40, 'e') }] as const),
  ...store.work.map((record, i) => [record.file, { bytes: new Uint8Array(solidJpeg(record.width, record.height)), sha: String(i + 1).padStart(40, 'a') }] as const),
]);
const INLINE_LIMIT = 1024 * 1024;

/*
 * The Git Data API, as the photo manager uses it: blobs staged without a
 * commit, then one tree + commit + fast-forward ref update. A tree is applied
 * to the store only when the ref moves, and only if its parent is the head —
 * so a stale save is refused exactly as GitHub refuses a non-fast-forward.
 */
const blobs = new Map<string, Uint8Array>();
const trees = new Map<string, Array<{ path: string; sha?: string | null; content?: string }>>();
const pendingCommits = new Map<string, { tree: string; parent: string }>();
let headSha = '0'.repeat(40);
let objects = 0;
const objectName = (prefix: string) => `${prefix}${String((objects += 1)).padStart(40 - prefix.length, '0')}`;

function mockGitData(url: string, method: string, init: RequestInit | undefined, json: (body: unknown, status?: number) => Response): Response | null {
  const path = new URL(url).pathname.split('/git/')[1];
  if (path === undefined) return null;
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
  if (path === 'blobs' && method === 'POST') {
    const sha = objectName('b');
    blobs.set(sha, new Uint8Array(Buffer.from(String(body.content ?? ''), 'base64')));
    return json({ sha }, 201);
  }
  if (path.startsWith('blobs/') && method === 'GET') {
    const bytes = blobs.get(path.slice(6));
    return bytes ? json({ sha: path.slice(6), size: bytes.length, encoding: 'base64', content: Buffer.from(bytes).toString('base64') }) : json({ message: 'Not Found' }, 404);
  }
  if (path.startsWith('ref/heads/') && method === 'GET') return json({ object: { sha: headSha } });
  if (path.startsWith('commits/') && method === 'GET') return json({ sha: path.slice(8), tree: { sha: '9'.repeat(40) } });
  if (path === 'trees' && method === 'POST') {
    const sha = objectName('a');
    trees.set(sha, body.tree as Array<{ path: string; sha?: string | null; content?: string }>);
    return json({ sha }, 201);
  }
  if (path === 'commits' && method === 'POST') {
    commits += 1;
    const sha = String(commits).padStart(40, 'f');
    pendingCommits.set(sha, { tree: String(body.tree), parent: String((body.parents as string[])[0]) });
    return json({ sha }, 201);
  }
  if (path.startsWith('refs/heads/') && method === 'PATCH') {
    const commit = pendingCommits.get(String(body.sha));
    if (!commit || commit.parent !== headSha || body.force !== false) return json({ message: 'Update is not a fast forward' }, 422);
    for (const entry of trees.get(commit.tree) ?? []) {
      if (entry.path === 'src/data/clinic-photography.json') {
        store.photos = JSON.parse(String(entry.content));
        blobShas.photos = String(commits).padStart(40, 'd');
      } else if (entry.path === 'src/data/treatment-work.json') {
        store.work = JSON.parse(String(entry.content));
        blobShas.work = String(commits).padStart(40, 'b');
      } else if (entry.path.startsWith('src/assets/images/')) {
        const name = entry.path.slice('src/assets/images/'.length);
        if (entry.sha === null) images.delete(name);
        else images.set(name, { bytes: blobs.get(String(entry.sha)) ?? new Uint8Array(), sha: String(entry.sha) });
      }
    }
    headSha = String(body.sha);
    lastCommit = headSha;
    return json({ object: { sha: headSha } });
  }
  return json({ message: 'not found' }, 404);
}

/** Answer the GitHub Contents and Actions APIs from the store above. */
function mockGitHub(url: string, init?: RequestInit): Response {
  const method = init?.method ?? 'GET';
  const accept = new Headers(init?.headers).get('Accept') ?? '';
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const gitData = mockGitData(url, method, init, json);
  if (gitData) return gitData;
  const kind = Object.entries(fileKinds).find(([file]) => url.includes(`/contents/src/data/${file}`))?.[1];
  const imageName = url.includes('/contents/src/assets/images/')
    ? decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '')
    : null;

  if (url.includes('/actions/workflows/deploy.yml/runs')) {
    return json({ workflow_runs: [{ head_sha: new URL(url).searchParams.get('head_sha'), status: 'completed', conclusion: 'success', updated_at: new Date().toISOString() }] });
  }
  if (url.includes('/actions/workflows/admin-preview.yml/runs')) return json({ workflow_runs: [] });
  // Fixture commits are numbered ('fff…12'), so "contains" is a comparison.
  if (url.includes('/compare/')) {
    const [base = '', head = ''] = (new URL(url).pathname.split('/compare/')[1] ?? '').split('...');
    const n = (sha: string) => Number.parseInt(sha.replace(/^f+/, '') || '0', 10);
    return json({ status: n(head) > n(base) ? 'ahead' : n(head) === n(base) ? 'identical' : 'behind' });
  }
  if (url.includes('/commits?')) {
    return json([{ sha: 'a'.repeat(40), commit: { message: 'cms(hours): update opening hours', author: { date: new Date().toISOString() } } }]);
  }

  if (method === 'PUT' || method === 'DELETE') {
    const body = JSON.parse(String(init?.body ?? '{}')) as { content?: string; sha?: string };
    commits += 1;
    const commit = String(commits).padStart(40, 'f');
    lastCommit = commit;
    headSha = commit;
    if (imageName) {
      const existing = images.get(imageName);
      if (existing && body.sha !== existing.sha) return json({ message: 'Conflict' }, 409);
      if (!existing && body.sha) return json({ message: 'Not found' }, 404);
      if (method === 'DELETE') { images.delete(imageName); return json({ commit: { sha: commit } }); }
      const sha = String(commits).padStart(40, 'c');
      images.set(imageName, { bytes: new Uint8Array(Buffer.from(body.content ?? '', 'base64')), sha });
      return json({ commit: { sha: commit }, content: { sha } });
    }
    if (kind && body.sha !== blobShas[kind]) return json({ message: 'Conflict' }, 409);
    if (kind && body.content) {
      (store as Record<string, unknown>)[kind] = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
    }
    if (kind) blobShas[kind] = String(commits).padStart(40, 'd');
    return json({ commit: { sha: commit }, content: kind ? { sha: blobShas[kind] } : undefined });
  }

  if (kind) {
    return json({ type: 'file', content: encode(`${JSON.stringify(store[kind], null, 2)}\n`), encoding: 'base64', sha: blobShas[kind] });
  }
  if (new URL(url).pathname.endsWith('/contents/src/assets/images')) {
    return json([...images.entries()].map(([name, image]) => ({ name, sha: image.sha, type: 'file' })));
  }
  if (imageName) {
    const image = images.get(imageName);
    if (!image) return json({ message: 'Not Found' }, 404);
    if (accept.includes('raw')) return new Response(image.bytes as Uint8Array<ArrayBuffer>, { status: 200 });
    const inline = image.bytes.length <= INLINE_LIMIT;
    return json({
      type: 'file', sha: image.sha, size: image.bytes.length,
      encoding: inline ? 'base64' : 'none',
      content: inline ? Buffer.from(image.bytes).toString('base64') : '',
    });
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
  if (url === 'https://www.drkhalilkanani.com/build.txt') {
    return publicCommit === null ? new Response('Not found', { status: 404 }) : new Response(`${publicCommit}\n`);
  }
  throw new Error(`[admin fixture] blocked network access to ${url}`);
}) as typeof fetch;
void realFetch;

/* ── Loopback server ─────────────────────────────────────────────────────── */

const server = createServer((incoming, outgoing) => {
  const chunks: Buffer[] = [];
  incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
  incoming.on('end', () => {
    void (async () => {
      if (incoming.url === '/__fixture/deploy' && incoming.method === 'POST') {
        deployedCommit = lastCommit || null;
        outgoing.statusCode = 204;
        outgoing.end();
        return;
      }
      if (incoming.url === '/__fixture/publish' && incoming.method === 'POST') {
        publicCommit = lastCommit || null;
        outgoing.statusCode = 204;
        outgoing.end();
        return;
      }
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
