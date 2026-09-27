#!/usr/bin/env node
/**
 * IndexNow: tell Bing (and every engine that shares IndexNow submissions)
 * which public pages changed in a deployment — and only those.
 *
 * Two steps, because "changed" can only be known before the deploy and a
 * notification is only honest after it:
 *
 *   node scripts/indexnow.mjs changed --dist dist --out indexnow-urls.txt
 *       Compares every page in the NEW sitemap with what the live site serves
 *       right now, and lists added, updated and removed URLs.
 *
 *   node scripts/indexnow.mjs submit --list indexnow-urls.txt --expect <sha>
 *       Waits until the live site's build.txt names <sha> (the deploy really
 *       landed), then submits the list. Nothing to submit → nothing is sent.
 *
 * The key is not a secret: IndexNow proves ownership by the key file being
 * served from the site itself (public/<key>.txt). Anyone could read it; only
 * the site owner can publish it.
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ORIGIN = 'https://www.drkhalilkanani.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const [command, ...rest] = process.argv.slice(2);
const flag = (name) => { const i = rest.indexOf(name); return i === -1 ? undefined : rest[i + 1]; };

async function key(dist = 'public') {
  const file = (await readdir(dist)).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  if (!file) throw new Error(`no IndexNow key file in ${dist}/`);
  const value = (await readFile(join(dist, file), 'utf8')).trim();
  if (`${value}.txt` !== file) throw new Error('IndexNow key file content does not match its name');
  return value;
}

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

async function sitemapUrls(read) {
  const index = await read('/sitemap-index.xml');
  if (index === null) return null;
  const urls = [];
  for (const sm of locs(index)) {
    const body = await read(new URL(sm).pathname);
    if (body !== null) urls.push(...locs(body));
  }
  return urls;
}

async function fetchText(path) {
  const res = await fetch(new URL(path, ORIGIN), { redirect: 'manual', headers: { 'user-agent': 'drkhalilkanani-deploy/indexnow' } });
  return res.status === 200 ? res.text() : null;
}

/**
 * build.txt and the per-build asset hashes are the only bytes that differ
 * between two builds of the same content (the build is deterministic, see
 * docs/HANDOFF.md), so pages are compared as served.
 */
async function changed() {
  const dist = flag('--dist') ?? 'dist';
  const out = flag('--out') ?? 'indexnow-urls.txt';
  const readDist = async (path) => readFile(join(dist, path), 'utf8').catch(() => null);
  const next = await sitemapUrls(readDist);
  if (!next) throw new Error('the new build has no sitemap');
  const live = (await sitemapUrls(fetchText)) ?? [];
  const list = [];
  for (const url of next) {
    const path = new URL(url).pathname;
    const [now, then] = await Promise.all([readDist(join(path, 'index.html')), fetchText(path)]);
    if (now !== then) list.push(url);
  }
  for (const url of live) if (!next.includes(url)) list.push(url); // removed: engines should recrawl and see the 404
  await writeFile(out, list.join('\n') + (list.length ? '\n' : ''));
  console.log(`IndexNow: ${list.length} of ${next.length} page(s) changed${list.length ? `:\n  ${list.join('\n  ')}` : ''}`);
}

async function submit() {
  const list = (await readFile(flag('--list') ?? 'indexnow-urls.txt', 'utf8')).split('\n').filter(Boolean);
  if (list.length === 0) { console.log('IndexNow: nothing changed, nothing sent.'); return; }
  if (list.some((u) => new URL(u).origin !== ORIGIN)) throw new Error('refusing to submit a URL outside the site');
  const expect = flag('--expect');
  if (expect) {
    // The Pages deploy is "done" before the CDN serves it everywhere.
    for (let attempt = 0; ; attempt++) {
      const served = (await fetchText(`/build.txt?ts=${Date.now()}`))?.trim();
      if (served === expect) break;
      if (attempt >= 30) throw new Error(`live site still serves ${served ?? 'nothing'}, not ${expect}; not notifying`);
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
  const k = await key(flag('--dist') ?? 'public');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(ORIGIN).host, key: k, keyLocation: `${ORIGIN}/${k}.txt`, urlList: list }),
  });
  console.log(`IndexNow: submitted ${list.length} URL(s) → HTTP ${res.status}`);
  if (res.status !== 200 && res.status !== 202) throw new Error(`IndexNow answered ${res.status}: ${await res.text()}`);
}

const commands = { changed, submit };
if (!commands[command]) { console.error('usage: indexnow.mjs changed|submit [...]'); process.exit(2); }
commands[command]().catch((e) => { console.error(e.message); process.exit(1); });
