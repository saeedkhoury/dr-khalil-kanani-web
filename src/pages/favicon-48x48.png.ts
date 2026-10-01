/** /favicon-48x48.png — the clinic tooth logo (src/lib/favicon.ts); Google asks for multiples of 48 px. */
import type { APIRoute } from 'astro';
import { bytesOfDataUri, faviconPng } from '../lib/favicon';
// Inlined at build: a runtime file read would resolve against dist/.
import logo from '../assets/brand/clinic-tooth.png?inline';

export const prerender = true;

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await faviconPng(bytesOfDataUri(logo), 48)), { headers: { 'content-type': 'image/png' } });
