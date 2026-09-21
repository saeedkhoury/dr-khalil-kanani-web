// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import { clinic } from './src/data/clinic.ts';

import cloudflare from '@astrojs/cloudflare';

import { assertLaunchReady, launchBlockers } from './src/lib/verify.ts';

/**
 * Runs the content-integrity gate once, at the start of every build.
 *
 * A gate that is defined but never invoked is not a gate — so this is wired
 * into the build lifecycle rather than left to a page to remember to call.
 */
function launchGate() {
  return {
    name: 'clinic:launch-gate',
    hooks: {
      'astro:build:start': () => {
        const isProd = process.env.NODE_ENV === 'production' || process.env.CI === 'true';
        assertLaunchReady(isProd);
      },
      'astro:config:setup': (/** @type {{ logger: { warn: (m: string) => void } }} */ { logger }) => {
        const blockers = launchBlockers();
        if (blockers.length > 0) {
          logger.warn(`${blockers.length} clinic fact(s) still unverified — see src/data/clinic.ts`);
        }
      },
    },
  };
}

/**
 * Astro 7 configuration.
 *
 * Fonts are declared here rather than linked from Google so Astro downloads,
 * subsets and self-hosts them. Discovery found a competitor loading all 18
 * variants of a webfont render-blocking from Google Fonts; self-hosting with
 * explicit subsets avoids that, and removes a third-party request that would
 * otherwise leak visitor IPs (a privacy consideration under Amendment 13).
 *
 * Only four weights ship: 300 is reserved for large display type, 400 carries
 * body copy, 600 is for eyebrow labels and UI, 700 for emphasis.
 */
export default defineConfig({
  site: process.env.ASTRO_SITE || clinic.siteUrl,
  base: process.env.ASTRO_BASE || undefined,
  trailingSlash: 'always',

  i18n: {
    locales: ['he', 'ar', 'en'],
    defaultLocale: 'he',
    routing: {
      // Every locale is prefixed, including the default. `/` redirects to /he/.
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Noto Sans Hebrew',
      cssVariable: '--font-he',
      weights: [300, 400, 600, 700],
      styles: ['normal'],
      subsets: ['hebrew', 'latin'],
      fallbacks: ['Arial Hebrew', 'David', 'system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Noto Sans Arabic',
      cssVariable: '--font-ar',
      weights: [300, 400, 600, 700],
      styles: ['normal'],
      subsets: ['arabic'],
      fallbacks: ['Geeza Pro', 'Tahoma', 'system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Noto Sans',
      cssVariable: '--font-en',
      weights: [300, 400, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
    },
  ],

  integrations: [
    launchGate(),
    sitemap({
      i18n: {
        defaultLocale: 'he',
        locales: { he: 'he', ar: 'ar', en: 'en' },
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});