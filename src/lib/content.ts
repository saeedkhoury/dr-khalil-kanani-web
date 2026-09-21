/**
 * Content access helpers.
 *
 * All reads go through here so locale filtering, draft filtering, ordering
 * and the parity assertion happen in exactly one place.
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n/config';
import { assertLocaleParity } from './verify';

export type Treatment = CollectionEntry<'treatments'>;

let parityChecked = false;

/** Every treatment for a locale, ordered by tier then explicit order. */
export async function getTreatments(locale: Locale): Promise<Treatment[]> {
  const all = await getCollection('treatments');

  // Assert once per build, across the whole collection, not per locale.
  if (!parityChecked) {
    parityChecked = true;
    assertLocaleParity(
      'treatments',
      all.map((e) => e.id),
    );
  }

  return all
    .filter((e) => e.data.locale === locale && !e.data.draft)
    .sort((a, b) => a.data.tier - b.data.tier || a.data.order - b.data.order);
}

export async function getTreatment(locale: Locale, slug: string): Promise<Treatment | undefined> {
  const all = await getTreatments(locale);
  return all.find((e) => e.data.slug === slug);
}

/** Sibling treatments for the "related" rail, excluding the current one. */
export async function getRelated(locale: Locale, slug: string, limit = 3): Promise<Treatment[]> {
  const all = await getTreatments(locale);
  return all.filter((e) => e.data.slug !== slug).slice(0, limit);
}

/** Distinct slugs, used to build static paths across locales. */
export async function getTreatmentSlugs(): Promise<string[]> {
  const all = await getCollection('treatments');
  return [...new Set(all.map((e) => e.data.slug))];
}
