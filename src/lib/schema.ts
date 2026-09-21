/**
 * JSON-LD graph builder.
 *
 * Decisions encoded here (docs/SEO.md):
 *
 *  • @type is `Dentist` — simultaneously a LocalBusiness, MedicalBusiness and
 *    MedicalOrganization, so it is strictly the most specific correct type.
 *    Google instructs using the most specific LocalBusiness subtype.
 *
 *  • ONE stable, language-neutral @id for the clinic, shared by all three
 *    locale pages. Minting #clinic-he / #clinic-ar / #clinic-en would tell
 *    Google there are three different dental clinics in Jadeidi-Makr and
 *    fragment every signal the site builds.
 *
 *  • `priceRange` is OMITTED. Google lists it as recommended, but Israeli
 *    dental advertising regulations prohibit publishing treatment prices.
 *    A recommended property is optional; a criminal offence is not.
 *
 *  • `aggregateRating` / `review` are OMITTED. Self-controlled reviews are
 *    explicitly ineligible for star rich results and risk manual action —
 *    and patient testimonials are prohibited under Israeli law regardless.
 *
 *  • `FAQPage` is NOT emitted. Google retired FAQ rich results on 2026-05-07.
 *
 *  • Nothing unverified is emitted. An empty PostalAddress is worse than no
 *    address — one of the reference sites shipped exactly that.
 */

import { clinic, hasAddress, hasHours } from '../data/clinic';
import type { Locale } from '../i18n/config';

const ID = {
  website: '#website',
  clinic: '#clinic',
  doctor: '#dentist',
};

function abs(path = ''): string {
  return new URL(path, clinic.siteUrl).toString();
}

interface GraphOptions {
  locale: Locale;
  /** Path of the current page, e.g. '/he/treatments/dental-implants/' */
  pathname: string;
  title: string;
  description: string;
  breadcrumbs?: Array<{ name: string; path: string }>;
}

export function buildGraph({ locale, pathname, title, description, breadcrumbs }: GraphOptions) {
  const nodes: Record<string, unknown>[] = [];

  /* ---- WebSite -------------------------------------------------------- */
  nodes.push({
    '@type': 'WebSite',
    '@id': abs(ID.website),
    url: abs('/'),
    name: clinic.doctor[locale],
    // alternateName recovers the multi-script naming that Google Business
    // Profile no longer permits in a single listing name (policy change
    // 2026-08-10 banning repeated names across scripts).
    alternateName: [clinic.doctor.he, clinic.doctor.ar, clinic.doctor.en],
    inLanguage: locale,
    publisher: { '@id': abs(ID.clinic) },
  });

  /* ---- Dentist (the clinic) ------------------------------------------- */
  const dentist: Record<string, unknown> = {
    '@type': 'Dentist',
    '@id': abs(ID.clinic), // identical on /he/, /ar/ and /en/
    name: `${clinic.doctor[locale]} — ${clinic.tagline[locale]}`,
    url: abs('/'),
    telephone: clinic.phone.landline.schema,
    // The clinic's genuine differentiator, machine-readable. Mirror this in
    // the GBP "Languages spoken" attribute.
    availableLanguage: ['he', 'ar', 'en'],
    areaServed: [
      { '@type': 'City', name: clinic.address.locality[locale] },
      { '@type': 'AdministrativeArea', name: clinic.address.region[locale] },
    ],
    sameAs: [clinic.social.instagram],
    employee: { '@id': abs(ID.doctor) },
    // priceRange: intentionally omitted — see file header.
    // aggregateRating / review: intentionally omitted — see file header.
  };

  // Only emit an address once a real street exists. Never ship an empty
  // PostalAddress, and never geocode a guessed location.
  if (hasAddress(locale)) {
    dentist.address = {
      '@type': 'PostalAddress',
      streetAddress: clinic.address.street[locale],
      addressLocality: clinic.address.locality[locale],
      addressRegion: clinic.address.region[locale],
      postalCode: clinic.address.postalCode,
      addressCountry: clinic.address.country,
    };
  }

  if (clinic.address.geo.lat !== 0 && clinic.address.geo.lng !== 0) {
    dentist.geo = {
      '@type': 'GeoCoordinates',
      latitude: clinic.address.geo.lat,
      longitude: clinic.address.geo.lng,
    };
  }

  if (hasHours()) {
    dentist.openingHoursSpecification = clinic.hours
      .filter((h) => !h.closed && h.opens && h.closes)
      .map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${h.day}`,
        opens: h.opens,
        closes: h.closes,
      }));
  }

  nodes.push(dentist);

  /* ---- Person (the dentist) ------------------------------------------- */
  nodes.push({
    '@type': 'Person',
    '@id': abs(ID.doctor),
    name: clinic.doctor[locale],
    jobTitle: locale === 'he' ? 'רופא שיניים' : locale === 'ar' ? 'طبيب أسنان' : 'Dentist',
    knowsLanguage: ['he', 'ar', 'en'],
    worksFor: { '@id': abs(ID.clinic) },
  });

  /* ---- WebPage (one per locale page) ---------------------------------- */
  nodes.push({
    '@type': 'WebPage',
    '@id': abs(`${pathname}#webpage`),
    url: abs(pathname),
    name: title,
    description,
    inLanguage: locale, // aligns with <html lang> and hreflang
    isPartOf: { '@id': abs(ID.website) },
    about: { '@id': abs(ID.clinic) },
  });

  /* ---- BreadcrumbList -------------------------------------------------- */
  if (breadcrumbs?.length) {
    nodes.push({
      '@type': 'BreadcrumbList',
      '@id': abs(`${pathname}#breadcrumbs`),
      itemListElement: breadcrumbs.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        item: abs(b.path),
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': nodes };
}
