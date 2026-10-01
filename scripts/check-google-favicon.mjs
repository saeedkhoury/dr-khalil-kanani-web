#!/usr/bin/env node
/**
 * Has Google picked up the clinic favicon yet? Read-only; touches nothing.
 *
 *   node scripts/check-google-favicon.mjs
 *
 * Google keeps one favicon per hostname and refreshes it on its own schedule,
 * after it recrawls that host's home page. Until 2026-10-01 /favicon.ico was
 * the Astro starter's "A", and Google Search kept showing it after the site
 * was fixed. This compares what Google's favicon services return for the www
 * and the bare hostname with the live /favicon.ico, so the wait can be
 * measured instead of guessed — and nobody "fixes" a correct site again.
 *
 * Exit code: 0 when every Google source shows the live icon, 1 while any is
 * still stale. An observation, not a gate: never wire it into CI or deploys.
 */
import sharp from 'sharp';

const ORIGIN = 'https://www.drkhalilkanani.com';
const HOSTS = ['www.drkhalilkanani.com', 'drkhalilkanani.com'];
/** faviconV2 is what Search result pages load (cached per size; results show 16–32 px); s2 is the older public service. */
const SOURCES = {
  faviconV2: (host) => `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${host}&size=32`,
  s2: (host) => `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
};
/** Compared at this size, flattened on white. */
const SIDE = 32;
/** Mean RGB difference (0–255). Measured 2026-10-01: the same icon rescaled by Google ≈ 14; the old "A" ≈ 155. */
const SAME_ICON = 50;

async function download(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** The largest frame of an ICO container (PNG-compressed frames, as the site builds them). */
function largestIcoFrame(ico) {
  if (ico.length < 6 || ico.readUInt32BE(0) !== 0x00000100) throw new Error('/favicon.ico is not an ICO file');
  const frames = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => {
    const entry = 6 + 16 * i;
    return { side: ico[entry] || 256, size: ico.readUInt32LE(entry + 8), offset: ico.readUInt32LE(entry + 12) };
  });
  const largest = frames.reduce((a, b) => (b.side > a.side ? b : a));
  return ico.subarray(largest.offset, largest.offset + largest.size);
}

const pixels = (image) =>
  sharp(image).flatten({ background: '#ffffff' }).resize(SIDE, SIDE).removeAlpha().raw().toBuffer();

function meanDifference(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}

const live = await pixels(largestIcoFrame(await download(`${ORIGIN}/favicon.ico`)));
let stale = 0;
for (const host of HOSTS) {
  for (const [name, url] of Object.entries(SOURCES)) {
    try {
      const difference = meanDifference(live, await pixels(await download(url(host))));
      const current = difference < SAME_ICON;
      if (!current) stale++;
      console.log(`${current ? 'current' : 'STALE  '}  ${host.padEnd(24)} ${name.padEnd(10)} difference ${difference.toFixed(1)}`);
    } catch (error) {
      stale++;
      console.log(`ERROR    ${host.padEnd(24)} ${name.padEnd(10)} ${error.message}`);
    }
  }
}
console.log(stale ? `\n${stale} Google source(s) still show another icon — waiting for Google's recrawl. Do not change the site.` : '\nGoogle shows the live favicon for every hostname.');
process.exitCode = stale ? 1 : 0;
