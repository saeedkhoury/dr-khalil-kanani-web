/** /favicon-96x96.png — the clinic mark (src/lib/favicon.ts); Google asks for multiples of 48 px. */
import type { APIRoute } from 'astro';
import { faviconPng } from '../lib/favicon';
// Inlined at build: a runtime file read would resolve against dist/.
import mark from '../../public/favicon.svg?raw';

export const prerender = true;

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await faviconPng(mark, 96)), { headers: { 'content-type': 'image/png' } });
