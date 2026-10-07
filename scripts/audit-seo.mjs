#!/usr/bin/env node
/**
 * Production-like SEO crawl of the PUBLIC site.
 *
 * Crawls from robots.txt → sitemap → every internal link, exactly as a search
 * engine would, and fails on the mechanical errors that should never ship:
 * wrong canonical, broken hreflang cluster, accidental noindex, a schema @id
 * on the wrong domain, a link to the admin, a broken internal link.
 *
 * It cannot judge whether content is helpful, only whether it is reachable,
 * indexable and consistently labelled. docs/SEO-RUNBOOK.md covers the rest.
 *
 * Usage:
 *   node scripts/audit-seo.mjs https://www.drkhalilkanani.com   (live)
 *   node scripts/audit-seo.mjs --dist dist --origin https://www.drkhalilkanani.com
 *       (a local build, served here the way GitHub Pages serves it: every
 *        canonical, hreflang and schema URL must still name --origin)
 *   --json <file>   also write the per-URL report as JSON
 *   --user-agent <ua>  crawl as a specific bot (default: Googlebot smartphone)
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; };
const DIST = flag('--dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

/** GitHub Pages semantics: /x → 301 /x/, /x/ → x/index.html, else 404.html. */
async function serveDist(dir) {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = join(root, path);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    try {
      const info = await stat(file);
      if (info.isDirectory()) {
        if (!path.endsWith('/')) { res.writeHead(301, { location: `${path}/` }).end(); return; }
        const body = await readFile(join(file, 'index.html'));
        res.writeHead(200, { 'content-type': TYPES['.html'] }).end(body);
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
    } catch {
      const body = await readFile(join(root, '404.html')).catch(() => '');
      res.writeHead(404, { 'content-type': TYPES['.html'] }).end(body);
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  server.unref();
  return `http://127.0.0.1:${server.address().port}`;
}

const BASE = DIST ? await serveDist(DIST) : new URL(args.find((a) => /^https?:\/\//.test(a)) ?? 'https://www.drkhalilkanani.com').origin;
const ORIGIN = new URL(flag('--origin') ?? BASE).origin;
const JSON_OUT = flag('--json');
const UA = flag('--user-agent') ?? 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const LOCALES = ['he', 'ar', 'en'];
const DIR = { he: 'rtl', ar: 'rtl', en: 'ltr' };
// Hosts that must never appear in public output — except the origin under test.
const FORBIDDEN_HOSTS = ['admin.drkhalilkanani.com', 'example.invalid', 'preview.invalid', 'qa.invalid', 'localhost', '127.0.0.1']
  .filter((h) => h !== new URL(ORIGIN).hostname);

const errors = [];
const warnings = [];
const err = (url, msg) => errors.push(`${url} — ${msg}`);
const warn = (url, msg) => warnings.push(`${url} — ${msg}`);

/** Local URL for a production URL: the crawl may run against a local build. */
const local = (u) => { const x = new URL(u, ORIGIN); return new URL(x.pathname + x.search, BASE).toString(); };
const prod = (u) => { const x = new URL(u, BASE); return x.origin === BASE ? new URL(x.pathname + x.search, ORIGIN).toString() : x.toString(); };

async function get(url, { ua = UA } = {}) {
  const res = await fetch(local(url), { redirect: 'manual', headers: { 'user-agent': ua } });
  const body = res.status === 200 ? await res.text() : '';
  return { status: res.status, location: res.headers.get('location'), type: res.headers.get('content-type') ?? '', body, xRobots: res.headers.get('x-robots-tag') };
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i')); return m ? decode(m[1] ?? m[2]) : undefined; };
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];
const text = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function parse(html) {
  const head = html.split(/<\/head>/i)[0];
  const htmlTag = tags(html, 'html')[0] ?? '';
  const metas = tags(head, 'meta');
  const meta = (key, val) => metas.find((m) => (attr(m, key) ?? '').toLowerCase() === val);
  const links = tags(head, 'link');
  const body = html.slice(head.length).replace(/<script\b[\s\S]*?<\/script>/gi, '');
  return {
    lang: attr(htmlTag, 'lang'),
    dir: attr(htmlTag, 'dir'),
    title: text((head.match(/<title>([\s\S]*?)<\/title>/i) ?? [])[1] ?? ''),
    description: attr(meta('name', 'description') ?? '', 'content'),
    robots: attr(meta('name', 'robots') ?? '', 'content') ?? '',
    canonical: links.filter((l) => /rel\s*=\s*"canonical"/i.test(l)).map((l) => attr(l, 'href')),
    hreflang: links.filter((l) => /rel\s*=\s*"alternate"/i.test(l) && attr(l, 'hreflang')).map((l) => ({ lang: attr(l, 'hreflang'), href: attr(l, 'href') })),
    icons: links.filter((l) => /rel\s*=\s*"[^"]*icon[^"]*"/i.test(l)).map((l) => ({ rel: (attr(l, 'rel') ?? '').toLowerCase(), href: attr(l, 'href') ?? '', sizes: attr(l, 'sizes') ?? '' })),
    og: Object.fromEntries(metas.filter((m) => /^og:|^twitter:/.test(attr(m, 'property') ?? attr(m, 'name') ?? '')).map((m) => [attr(m, 'property') ?? attr(m, 'name'), attr(m, 'content')])),
    headings: [...body.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: text(m[2]) })),
    jsonld: [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]),
    anchors: tags(body, 'a').map((a) => attr(a, 'href')).filter(Boolean),
    images: tags(body, 'img').map((i) => ({ src: attr(i, 'src'), alt: attr(i, 'alt'), width: attr(i, 'width'), height: attr(i, 'height'), loading: attr(i, 'loading') })),
  };
}

function sameSite(href) {
  try { const u = new URL(href, ORIGIN); return (u.origin === ORIGIN || u.origin === BASE) ? u : null; } catch { return null; }
}

async function main() {
  const report = {};

  // ── robots.txt ──
  const robots = await get(`${ORIGIN}/robots.txt`);
  const sitemapUrls = [];
  if (robots.status !== 200) err('/robots.txt', `status ${robots.status}`);
  else {
    for (const m of robots.body.matchAll(/^sitemap:\s*(\S+)/gim)) sitemapUrls.push(m[1]);
    if (sitemapUrls.length === 0) err('/robots.txt', 'no Sitemap: line');
    for (const s of sitemapUrls) if (new URL(s).origin !== ORIGIN) err('/robots.txt', `sitemap on another origin: ${s}`);
    // A global Disallow: / would hide the whole site.
    const groups = robots.body.split(/\n(?=user-agent:)/i);
    for (const g of groups) {
      const agents = [...g.matchAll(/^user-agent:\s*(\S+)/gim)].map((m) => m[1].toLowerCase());
      if (/^disallow:\s*\/\s*$/im.test(g) && agents.some((a) => ['*', 'googlebot', 'bingbot', 'oai-searchbot'].includes(a))) {
        err('/robots.txt', `Disallow: / for ${agents.join(', ')}`);
      }
    }
  }

  // ── sitemap(s) ──
  const inSitemap = new Set();
  const queue = [...(sitemapUrls.length ? sitemapUrls : [`${ORIGIN}/sitemap-index.xml`])];
  while (queue.length) {
    const sm = queue.shift();
    const r = await get(sm);
    if (r.status !== 200) { err(sm, `sitemap status ${r.status}`); continue; }
    for (const m of r.body.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)) queue.push(decode(m[1]));
    for (const m of r.body.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)) inSitemap.add(decode(m[1]));
  }
  if (inSitemap.size === 0) err('sitemap', 'no URLs');
  for (const u of inSitemap) {
    if (new URL(u).origin !== ORIGIN) err(u, 'sitemap URL on another origin');
    if (FORBIDDEN_HOSTS.some((h) => u.includes(h))) err(u, 'forbidden host in sitemap');
  }

  // ── crawl: sitemap + everything linked from the home page ──
  const pages = new Map(); // prod url -> parsed
  const shareImages = new Set(); // every og:image any page names
  const depth = new Map([[`${ORIGIN}/`, 0]]);
  const inbound = new Map();
  const todo = [`${ORIGIN}/`, ...inSitemap];
  for (const u of inSitemap) if (!depth.has(u)) depth.set(u, Infinity);
  const seen = new Set();
  while (todo.length) {
    const url = todo.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const r = await get(url);
    const entry = { status: r.status };
    report[url] = entry;
    if (r.status >= 300 && r.status < 400) {
      entry.redirect = r.location;
      if (inSitemap.has(url)) err(url, `sitemap URL redirects to ${r.location}`);
      const next = sameSite(r.location ?? '');
      if (next) { const n = prod(next.toString()); if (!depth.has(n)) depth.set(n, depth.get(url)); todo.push(n); }
      continue;
    }
    if (r.status !== 200) { err(url, `status ${r.status}${inbound.has(url) ? ` (linked from ${[...inbound.get(url)].slice(0, 2).join(', ')})` : ''}`); continue; }
    if (!/text\/html/.test(r.type)) continue;
    const p = parse(r.body);
    pages.set(url, p);
    Object.assign(entry, { title: p.title, description: p.description, canonical: p.canonical[0], robots: p.robots, lang: p.lang, h1: p.headings.filter((h) => h.level === 1).map((h) => h.text) });
    if (r.xRobots) entry.xRobots = r.xRobots;
    for (const h of p.anchors) {
      const u = sameSite(h);
      if (!u) continue;
      u.hash = '';
      const n = prod(u.toString());
      if (!inbound.has(n)) inbound.set(n, new Set());
      inbound.get(n).add(url);
      if (!depth.has(n) || depth.get(n) > depth.get(url) + 1) depth.set(n, depth.get(url) + 1);
      if (!seen.has(n)) todo.push(n);
    }
  }

  // ── per-page checks ──
  const indexable = [];
  for (const [url, p] of pages) {
    const path = new URL(url).pathname;
    const noindex = /noindex/i.test(p.robots) || /noindex/i.test(report[url].xRobots ?? '');
    const canonical = p.canonical[0];
    const selfCanonical = canonical === url;
    const is404 = /\/404\/?$/.test(path);
    if (!noindex && selfCanonical) indexable.push(url);
    if (is404) continue;

    if (p.canonical.length !== 1) err(url, `${p.canonical.length} canonical tags`);
    if (canonical && new URL(canonical).origin !== ORIGIN) err(url, `canonical on another origin: ${canonical}`);
    if (canonical && canonical !== url) {
      if (inSitemap.has(url)) err(url, `in sitemap but canonical is ${canonical}`);
      else if (!pages.has(canonical)) err(url, `canonical target not crawlable: ${canonical}`);
    }
    if (inSitemap.has(url) && noindex) err(url, 'in sitemap but noindex');
    if (!inSitemap.has(url) && selfCanonical && !noindex) err(url, 'indexable but missing from sitemap');
    if (!path.endsWith('/') && !/\.[a-z]+$/.test(path)) err(url, 'no trailing slash');

    const locale = path.split('/')[1];
    const expectLocale = LOCALES.includes(locale) ? locale : 'he';
    if (p.lang !== expectLocale) err(url, `lang="${p.lang}", expected ${expectLocale}`);
    if (p.dir !== DIR[expectLocale]) err(url, `dir="${p.dir}", expected ${DIR[expectLocale]}`);

    if (!p.title) err(url, 'empty <title>');
    else if (p.title.length > 65) warn(url, `title ${p.title.length} chars (may truncate): ${p.title}`);
    if (!p.description) err(url, 'no meta description');
    else if (p.description.length < 50 || p.description.length > 170) warn(url, `description ${p.description.length} chars`);

    const h1 = p.headings.filter((h) => h.level === 1);
    if (h1.length !== 1) err(url, `${h1.length} <h1>`);
    let prev = 0;
    for (const h of p.headings) { if (prev && h.level > prev + 1) err(url, `heading skips h${prev} → h${h.level} ("${h.text.slice(0, 40)}")`); prev = h.level; }

    // hreflang cluster
    const langs = p.hreflang.map((h) => h.lang);
    for (const l of [...LOCALES, 'x-default']) if (!langs.includes(l)) err(url, `hreflang ${l} missing`);
    if (new Set(langs).size !== langs.length) err(url, 'duplicate hreflang');
    for (const h of p.hreflang) {
      if (!/^https:\/\//.test(h.href)) err(url, `hreflang ${h.lang} not absolute https: ${h.href}`);
      else if (new URL(h.href).origin !== ORIGIN) err(url, `hreflang ${h.lang} on another origin: ${h.href}`);
    }
    if (selfCanonical && !p.hreflang.some((h) => h.lang === expectLocale && h.href === url)) err(url, 'hreflang has no self-reference');

    // Open Graph
    for (const k of ['og:title', 'og:description', 'og:url', 'og:image']) if (!p.og[k]) err(url, `${k} missing`);
    if (p.og['og:url'] && p.og['og:url'] !== canonical) err(url, `og:url ${p.og['og:url']} ≠ canonical`);
    if (p.og['og:image'] && !/^https:\/\//.test(p.og['og:image'])) err(url, `og:image not absolute: ${p.og['og:image']}`);
    else if (p.og['og:image'] && new URL(p.og['og:image']).origin !== ORIGIN) err(url, `og:image on another origin: ${p.og['og:image']}`);
    for (const k of ['og:image:secure_url', 'twitter:image']) if (p.og[k] !== p.og['og:image']) err(url, `${k} ${p.og[k] ?? 'missing'} ≠ og:image`);
    for (const k of ['og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt']) if (!p.og[k]) err(url, `${k} missing`);
    if (p.og['og:image']) shareImages.add(p.og['og:image']);

    // Structured data
    if (p.jsonld.length === 0) err(url, 'no JSON-LD');
    for (const raw of p.jsonld) {
      let data;
      try { data = JSON.parse(raw); } catch (e) { err(url, `JSON-LD does not parse: ${e.message}`); continue; }
      const ids = JSON.stringify(data).match(/https?:\/\/[^"\s]+/g) ?? [];
      for (const id of ids) if (FORBIDDEN_HOSTS.some((h) => new URL(id).hostname === h)) err(url, `JSON-LD names ${new URL(id).hostname}`);
      const graph = data['@graph'] ?? [data];
      for (const node of graph) {
        if (typeof node['@id'] === 'string' && new URL(node['@id']).origin !== ORIGIN) err(url, `@id on another origin: ${node['@id']}`);
        if (node['@type'] === 'WebPage' && node.url !== url && selfCanonical) err(url, `WebPage.url ${node.url} ≠ page`);
        if (/Rating|Review/.test(JSON.stringify(node['@type'])) || node.aggregateRating || node.review) err(url, 'self-serving rating/review markup');
      }
    }

    // Images
    for (const img of p.images) {
      if (!img.src) continue; // a script-filled slot (the gallery lightbox)
      if (img.alt === undefined) err(url, `<img> without alt: ${img.src}`);
      if (!img.width || !img.height) warn(url, `<img> without width/height: ${img.src}`);
    }

    // Links
    for (const h of p.anchors) {
      try {
        const u = new URL(h, ORIGIN);
        if (FORBIDDEN_HOSTS.includes(u.hostname)) err(url, `links to ${u.hostname}`);
        if (u.protocol === 'http:' && (u.hostname.endsWith('drkhalilkanani.com'))) err(url, `insecure link ${h}`);
      } catch { /* mailto:, tel: etc. */ }
    }
  }

  // ── link-preview image: what WhatsApp, iMessage, Facebook and X fetch ──
  // 2026-10-07: every page shared an illustration (tooth + dental mirror);
  // the preview is now the clinic logo at one stable, versioned URL.
  for (const imageUrl of shareImages) {
    const r = await fetch(local(imageUrl), { redirect: 'manual' });
    const type = r.headers.get('content-type') ?? '';
    if (r.status !== 200 || !/^image\/png/.test(type)) { err(imageUrl, `share image answers ${r.status} ${type}`); continue; }
    const png = Buffer.from(await r.arrayBuffer());
    const [w, h] = png.length > 24 ? [png.readUInt32BE(16), png.readUInt32BE(20)] : [0, 0];
    if (w !== 1200 || h !== 630) err(imageUrl, `share image is ${w}×${h}, expected 1200×630`);
  }
  if (shareImages.size !== 1) err('og:image', `pages share ${shareImages.size} different preview images; expected the one clinic logo`);

  // ── favicon: ONE declaration, the same on every page ──
  // 2026-10-01: /favicon.ico was still the Astro starter's "A" and Google
  // Search showed it. Google takes the site's favicon from the home page's
  // icon declaration; one stable URL, nothing else for it to choose from.
  for (const [url, p] of pages) {
    const declared = p.icons.map((i) => `${i.rel} ${new URL(i.href, url).pathname}`);
    if (declared.join('|') !== 'icon /favicon.ico') err(url, `icon declarations must be exactly <link rel="icon" href="/favicon.ico">, found: ${declared.join(', ') || 'none'}`);
  }
  for (const path of ['/favicon.ico', '/apple-touch-icon.png']) {
    const r = await get(`${ORIGIN}${path}`);
    if (r.status !== 200 || !/^image\//.test(r.type)) err(path, `icon answers ${r.status} ${r.type}`);
  }
  for (const path of ['/favicon.svg', '/favicon.png', '/favicon-48x48.png', '/favicon-96x96.png', '/site.webmanifest', '/manifest.json']) {
    const r = await get(`${ORIGIN}${path}`);
    if (r.status === 200) err(path, 'an alternative icon or manifest is published; Google must have one favicon to choose');
  }
  // The template's "A" was a PNG merely named .ico; the real one is an ICO container.
  const ico = Buffer.from(await (await fetch(local(`${ORIGIN}/favicon.ico`))).arrayBuffer());
  if (ico.length < 6 || ico.readUInt32BE(0) !== 0x00000100) err('/favicon.ico', 'not an ICO file (a renamed template image?)');

  // ── hreflang reciprocity ──
  for (const [url, p] of pages) {
    if (p.canonical[0] !== url) continue;
    for (const h of p.hreflang) {
      if (h.lang === 'x-default') continue;
      const target = pages.get(h.href);
      if (!target) { if (!report[h.href]) err(url, `hreflang ${h.lang} target not crawled: ${h.href}`); else if (report[h.href].status !== 200) err(url, `hreflang ${h.lang} → ${report[h.href].status}`); continue; }
      if (target.canonical[0] !== h.href) err(url, `hreflang ${h.lang} → non-canonical ${h.href}`);
      if (!target.hreflang.some((b) => b.href === url)) err(url, `hreflang ${h.lang} not reciprocated by ${h.href}`);
    }
  }

  // ── duplicates, orphans, depth ──
  const dup = (key) => {
    const by = new Map();
    for (const u of indexable) { const v = pages.get(u)[key]; if (!v) continue; by.set(v, [...(by.get(v) ?? []), u]); }
    for (const [v, us] of by) if (us.length > 1) err(us.join(' + '), `duplicate ${key}: "${v.slice(0, 60)}"`);
  };
  dup('title'); dup('description');
  for (const u of inSitemap) {
    if (!inbound.has(u) && u !== `${ORIGIN}/`) err(u, 'orphan: no internal link points here');
    if ((depth.get(u) ?? Infinity) > 3) warn(u, `crawl depth ${depth.get(u)}`);
  }

  // ── 404 behaviour ──
  const missing = await get(`${ORIGIN}/this-page-does-not-exist-${Date.now()}/`);
  if (missing.status !== 404) err('404', `a missing page answers ${missing.status}`);

  const summary = { base: BASE, origin: ORIGIN, crawled: pages.size, sitemap: inSitemap.size, indexable: indexable.length, errors: errors.length, warnings: warnings.length };
  if (JSON_OUT) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(JSON_OUT, JSON.stringify({ summary, errors, warnings, pages: report, depth: Object.fromEntries(depth) }, null, 2));
  }
  console.log(JSON.stringify(summary));
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  if (errors.length) { console.log(`\n✗ SEO audit: ${errors.length} error(s).`); process.exit(1); }
  console.log(`\n✓ SEO audit: ${pages.size} page(s) crawled, ${inSitemap.size} in sitemap, all checks passed.`);
}

main().catch((e) => { console.error(e); process.exit(2); });
