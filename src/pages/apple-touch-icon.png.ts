/** /apple-touch-icon.png — 180×180, the clinic tooth logo (src/lib/favicon.ts). */
import type { APIRoute } from 'astro';
import { appleTouchIcon, bytesOfDataUri } from '../lib/favicon';
// Inlined at build: a runtime file read would resolve against dist/.
import logo from '../assets/brand/clinic-tooth.png?inline';

export const prerender = true;

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await appleTouchIcon(bytesOfDataUri(logo))), { headers: { 'content-type': 'image/png' } });
