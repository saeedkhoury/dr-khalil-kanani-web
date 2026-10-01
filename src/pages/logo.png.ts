/**
 * /logo.png — the logo mark as a raster image, for the Dentist JSON-LD `logo`.
 *
 * Google does not accept SVG logos and needs at least 112×112 px. Rendering
 * the clinic mark's SVG (src/assets/brand/clinic-mark.svg — the header logo's
 * paths) keeps ONE logo source: the mark cannot drift from the one visitors see. It contains no text, so no font is involved.
 */
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { LOGO_SIZE } from '../lib/schema';
// Inlined at build: a runtime file read would resolve against dist/.
import mark from '../assets/brand/clinic-mark.svg?raw';

export const prerender = true;

export const GET: APIRoute = async () => {
  const png = await sharp(Buffer.from(mark), { density: 600 })
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png' } });
};
