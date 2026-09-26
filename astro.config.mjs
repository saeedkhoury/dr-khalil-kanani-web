// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import { clinic } from './src/data/clinic.ts';

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
 * FULLY STATIC — no adapter. The site deploys to GitHub Pages, which serves
 * static files only. An adapter was previously configured, which split the
 * build into `dist/client` + `dist/server`; the workflow uploaded only
 * `dist/client`, so the appointment endpoint in `dist/server` was never
 * deployed and every request submitted on the live site was lost (405).
 *
 * The form now hands off to WhatsApp (ADR 0007), so no server is needed at
 * all. Output goes to `dist/` and what is built is exactly what is served.
 *
 * The exact Noto font bytes previously served by Astro are kept in
 * src/assets/fonts. Astro copies these local files into the build without
 * requesting mutable Google Fonts responses. Locale-specific faces keep the
 * visitor download limited to the script the page uses.
 *
 * Only four weights ship: 300 is reserved for large display type, 400 carries
 * body copy, 600 is for eyebrow labels and UI, 700 for emphasis.
 */
export default defineConfig({
  site: process.env.ASTRO_SITE || clinic.siteUrl,
  outDir: process.env.VISUAL_CMS === '1' ? './workers/admin/dist' : './dist',
  base: process.env.ASTRO_BASE || undefined,
  trailingSlash: 'always',

  i18n: {
    locales: ['he', 'ar', 'en'],
    defaultLocale: 'he',
    routing: {
      // Every locale is prefixed, including the default. `/` renders default locale via index.astro.
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },

  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Noto Sans Hebrew',
      cssVariable: '--font-he',
      weights: [300, 400, 600, 700],
      styles: ['normal'],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/noto-sans-hebrew-hebrew.woff2'],
            weight: '300 700',
            style: 'normal',
            unicodeRange: ['U+0307-0308', 'U+0590-05FF', 'U+200C-2010', 'U+20AA', 'U+25CC', 'U+FB1D-FB4F'],
          },
          {
            src: ['./src/assets/fonts/noto-sans-hebrew-latin.woff2'],
            weight: '300 700',
            style: 'normal',
            unicodeRange: ['U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC', 'U+0304', 'U+0308', 'U+0329', 'U+2000-206F', 'U+20AC', 'U+2122', 'U+2191', 'U+2193', 'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD'],
          },
        ],
      },
      fallbacks: ['Arial Hebrew', 'David', 'system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.local(),
      name: 'Noto Sans Arabic',
      cssVariable: '--font-ar',
      weights: [300, 400, 600, 700],
      styles: ['normal'],
      options: {
        variants: [{
          src: ['./src/assets/fonts/noto-sans-arabic-arabic.woff2'],
          weight: '300 700',
          style: 'normal',
        }],
      },
      fallbacks: ['Geeza Pro', 'Tahoma', 'system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.local(),
      name: 'Noto Sans',
      cssVariable: '--font-en',
      weights: [300, 400, 600, 700],
      styles: ['normal'],
      options: {
        variants: [{
          src: ['./src/assets/fonts/noto-sans-latin.woff2'],
          weight: '300 700',
          style: 'normal',
        }],
      },
      fallbacks: ['system-ui', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
    },
  ],

  integrations: [
    launchGate(),
    ...(process.env.VISUAL_CMS === '1' ? [] : [sitemap({
      i18n: {
        defaultLocale: 'he',
        locales: { he: 'he', ar: 'ar', en: 'en' },
      },
    })]),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

});
