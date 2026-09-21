/**
 * Resolves a filename from the media manifest to a real Astro image asset.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * `src/data/media.ts` stores plain filenames so the owner can add a photo by
 * dropping the file in and writing one entry. But Astro's <Image> needs an
 * imported `ImageMetadata`, not a string path — passing a string silently
 * fails to optimise, or errors outright.
 *
 * `import.meta.glob` with `eager: true` builds the filename-to-asset map at
 * build time, so the manifest stays declarative and the promise in
 * docs/ASSETS.md ("add the file, register it, done") is actually true.
 *
 * Only files that really exist are resolved. A manifest entry pointing at a
 * missing file returns undefined, and the caller skips it — a broken <img>
 * on a clinic site looks worse than an absent one.
 */

import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

/** Filename (as registered in the manifest) -> imported asset. */
const byName = new Map<string, ImageMetadata>(
  Object.entries(files).map(([path, mod]) => [path.split('/').pop()!, mod.default]),
);

export function resolveImage(file: string): ImageMetadata | undefined {
  return byName.get(file);
}

/** Every image file actually present on disk. Used by tests and diagnostics. */
export function availableImages(): string[] {
  return [...byName.keys()].sort();
}
