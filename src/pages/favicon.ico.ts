/**
 * /favicon.ico — the clinic tooth logo at 16, 32 and 48 px (src/lib/favicon.ts).
 * Browsers, bookmark tools and Google fall back to this path even when the
 * page declares other icons; it held the Astro starter's "A" until 2026-10-01.
 */
import type { APIRoute } from 'astro';
import { bytesOfDataUri, faviconPng, icoFromPngs, ICO_SIZES } from '../lib/favicon';
// Inlined at build: a runtime file read would resolve against dist/.
import logo from '../assets/brand/clinic-tooth.png?inline';

export const prerender = true;

export const GET: APIRoute = async () => {
  const source = bytesOfDataUri(logo);
  const images = await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await faviconPng(source, size) })));
  return new Response(new Uint8Array(icoFromPngs(images)), { headers: { 'content-type': 'image/x-icon' } });
};
