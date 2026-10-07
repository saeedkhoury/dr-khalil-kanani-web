/** /social/clinic-share-v1.png — the link-preview image: the clinic logo (src/lib/social-image.ts). */
import type { APIRoute } from 'astro';
import { renderSocialImage } from '../../lib/social-image';
// Inlined at build: a runtime file read would resolve against dist/.
import mark from '../../assets/brand/clinic-mark.svg?raw';

export const prerender = true;

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await renderSocialImage(mark)), { headers: { 'content-type': 'image/png' } });
