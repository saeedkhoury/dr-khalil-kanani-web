/**
 * /robots.txt — a deliberate policy, not a default (docs/SEO-RUNBOOK.md).
 *
 * The public site is meant to be found: every crawler may fetch every page,
 * including search crawlers for AI answers (OAI-SearchBot, and PerplexityBot,
 * Claude-SearchBot etc. under `*`). Nothing is listed here for "privacy": the
 * admin lives on another host behind Cloudflare Access, and naming private
 * paths in a public file would only advertise them.
 *
 * GPTBot and other model-TRAINING crawlers are a separate owner decision
 * (OpenAI documents GPTBot and OAI-SearchBot as independent). This file does
 * not block them today; see the runbook before changing that.
 *
 * The Edit Mode build is never for crawlers, so it disallows everything.
 */
import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const body = process.env.VISUAL_CMS === '1'
    ? 'User-agent: *\nDisallow: /\n'
    : [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${new URL('/sitemap-index.xml', site).toString()}`,
        '',
      ].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
