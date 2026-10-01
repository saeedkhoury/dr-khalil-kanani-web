/**
 * /favicon.ico — the site's one icon: the clinic tooth logo at 16–192 px
 * (src/lib/favicon.ts). Keep this URL stable; Google caches favicons by URL.
 * It held the Astro starter's "A" until 2026-10-01.
 */
import type { APIRoute } from 'astro';
import { faviconPng, icoFromPngs, ICO_SIZES } from '../lib/favicon';
// Inlined at build: a runtime file read would resolve against dist/.
import mark from '../assets/brand/clinic-mark.svg?raw';

export const prerender = true;

export const GET: APIRoute = async () => {
  const images = await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await faviconPng(mark, size) })));
  return new Response(new Uint8Array(icoFromPngs(images)), { headers: { 'content-type': 'image/x-icon' } });
};
