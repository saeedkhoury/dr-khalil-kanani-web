/** One structured source for all three locales and every service URL. */
import rawServices from '../data/services.json' with { type: 'json' };
import type { Locale } from '../i18n/config';
import { parseManaged, servicesSchema, type Service } from './managed-schema.ts';

const services = parseManaged(servicesSchema, rawServices, 'services');

export interface Treatment {
  id: string;
  data: Omit<Service['locales'][Locale], 'reviewedOn'> & Pick<Service, 'slug' | 'tier' | 'order' | 'icon'> & { locale: Locale; reviewedOn?: Date };
}

export async function getTreatments(locale: Locale): Promise<Treatment[]> {
  return services.filter((service) => service.status === 'published')
    // The order the doctor sets in Edit Mode is the order visitors see. Tier
    // only breaks ties; sorting by it first made a drag across the tier
    // boundary snap straight back.
    .sort((a, b) => a.order - b.order || a.tier - b.tier || a.id.localeCompare(b.id))
    .map((service) => ({
      id: `${locale}/${service.slug}`,
      data: {
        ...service.locales[locale],
        reviewedOn: service.locales[locale].reviewedOn ? new Date(service.locales[locale].reviewedOn) : undefined,
        slug: service.slug, tier: service.tier, order: service.order, icon: service.icon, locale,
      },
    }));
}

export async function getTreatment(locale: Locale, slug: string): Promise<Treatment | undefined> {
  return (await getTreatments(locale)).find((item) => item.data.slug === slug);
}

export async function getRelated(locale: Locale, slug: string, limit = 3): Promise<Treatment[]> {
  return (await getTreatments(locale)).filter((item) => item.data.slug !== slug).slice(0, limit);
}

export async function getTreatmentSlugs(): Promise<string[]> {
  return services.filter((service) => service.status === 'published').map((service) => service.slug);
}
