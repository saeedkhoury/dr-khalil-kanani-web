/** /apple-touch-icon.png — 180×180, the clinic tooth logo on white (src/lib/favicon.ts). */
import type { APIRoute } from 'astro';
import { appleTouchIcon } from '../lib/favicon';
// Inlined at build: a runtime file read would resolve against dist/.
import mark from '../assets/brand/clinic-mark.svg?raw';

export const prerender = true;

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await appleTouchIcon(mark)), { headers: { 'content-type': 'image/png' } });
