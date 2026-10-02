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
 *
 *  • Every URL and @id is built from the SAME origin as the page's canonical.
 *    The graph used to read a placeholder origin directly, so the live site
 *    described a clinic at example.invalid for its first weeks (SEO audit,
 *    2026-09-27). The origin is now a required argument.
 */

import { clinic, confirmedDoctorNames, GOOGLE_BUSINESS_PROFILE, hasAddress, hasGeo, hasHours } from '../data/clinic.ts';
import { localizePath, type Locale } from '../i18n/config.ts';

const ID = {
  website: '#website',
  clinic: '#clinic',
  doctor: '#dentist',
};

/**
 * JSON for inside <script>. Titles and descriptions come from the CMS, and
 * JSON.stringify leaves `<` alone, so a text containing "</script>" would end
 * the element and run whatever followed. \u003c is the same character to a
 * JSON parser and inert to the HTML one.
 */
export function serializeGraph(graph: unknown): string {
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}

/** Raster logo rendered at build (src/pages/logo.png.ts); Google needs ≥112px. */
export const LOGO_PATH = '/logo.png';
export const LOGO_SIZE = 512;

interface GraphOptions {
  /** The origin every URL is built on — the same one as the canonical. */
  origin: string;
  locale: Locale;
  /** Path of the current page, e.g. '/he/treatments/dental-implants/' */
  pathname: string;
  title: string;
  description: string;
  breadcrumbs?: Array<{ name: string; path: string }>;
  /** Published treatments in this locale, in the doctor's order. */
  services?: Array<{ slug: string; name: string }>;
  /** 'ProfilePage' for the doctor's about page; otherwise a WebPage. */
  pageType?: 'WebPage' | 'ProfilePage';
}

/**
 * The clinic's public profiles: the confirmed Instagram, plus the Facebook
 * page and Google Business Profile the moment the owner enters them in Edit
 * Mode. An empty field is simply absent — never guessed.
 */
function officialProfiles(): string[] {
  const urls = [clinic.social.instagram, clinic.social.facebook, GOOGLE_BUSINESS_PROFILE, clinic.social.googleBusiness]
    .map((url) => url.trim())
    .filter((url) => url.startsWith('https://'));
  return [...new Set(urls)];
}

/**
 * The page's own name first, then every other CONFIRMED spelling: one doctor
 * and one clinic whichever script Google meets them in. "Dr Khalil Kanani"
 * otherwise matched an unrelated doctor in Beirut (2026-10-01), because the
 * Business Profile carries the Hebrew name only.
 */
function otherNames(locale: Locale): string[] {
  return confirmedDoctorNames().filter((name) => name !== clinic.doctor[locale]);
}

export function buildGraph({ origin, locale, pathname, title, description, breadcrumbs, services = [], pageType = 'WebPage' }: GraphOptions) {
  const abs = (path = ''): string => new URL(path, origin).toString();
  const nodes: Record<string, unknown>[] = [];
  const logo = { '@type': 'ImageObject', '@id': abs('/#logo'), url: abs(LOGO_PATH), contentUrl: abs(LOGO_PATH), width: LOGO_SIZE, height: LOGO_SIZE, caption: clinic.doctor[locale] };

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
    // Exactly the verified Google Business Profile name, so the two are read
    // as one entity. The descriptive form stays findable as an alternate name.
    name: clinic.doctor[locale],
    alternateName: [`${clinic.doctor[locale]} — ${clinic.tagline[locale]}`, ...otherNames(locale)],
    // The domain's home, identical on every page so the entity never splits.
    url: abs('/'),
    logo,
    image: { '@id': abs('/#logo') },
    telephone: clinic.phone.landline.schema,
    // The clinic's genuine differentiator, machine-readable. Mirror this in
    // the GBP "Languages spoken" attribute.
    // schema.org defines availableLanguage on a ContactPoint, not on the
    // business (the validator flagged it there, 2026-09-27): the clinic
    // "knows" three languages, and its phone line is available in them.
    knowsLanguage: ['he', 'ar', 'en'],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: clinic.phone.landline.schema,
      contactType: 'customer service',
      availableLanguage: ['he', 'ar', 'en'],
    },
    areaServed: [
      { '@type': 'City', name: clinic.address.locality[locale] },
      { '@type': 'AdministrativeArea', name: clinic.address.region[locale] },
    ],
    sameAs: officialProfiles(),
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

  if (hasGeo()) {
    dentist.geo = {
      '@type': 'GeoCoordinates',
      latitude: clinic.address.geo.lat,
      longitude: clinic.address.geo.lng,
    };
    // The Business Profile's own Maps place: the site and the profile are
    // one clinic. (The page's visible map link still opens the pin.)
    dentist.hasMap = GOOGLE_BUSINESS_PROFILE;
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

  // The treatments the clinic's own site describes, each with a stable @id on
  // its page. Names come from the same CMS data as the pages, so the markup
  // cannot list a treatment the site does not show.
  const serviceId = (slug: string) => `${abs(localizePath(locale, `treatments/${slug}`))}#service`;
  if (services.length > 0) {
    dentist.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: locale === 'he' ? 'טיפולים' : locale === 'ar' ? 'العلاجات' : 'Treatments',
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          '@id': serviceId(s.slug),
          name: s.name,
          url: abs(localizePath(locale, `treatments/${s.slug}`)),
          provider: { '@id': abs(ID.clinic) },
        },
      })),
    };
  }

  nodes.push(dentist);

  /* ---- Person (the dentist) ------------------------------------------- */
  nodes.push({
    '@type': 'Person',
    '@id': abs(ID.doctor),
    name: clinic.doctor[locale],
    alternateName: otherNames(locale),
    jobTitle: locale === 'he' ? 'רופא שיניים' : locale === 'ar' ? 'طبيب أسنان' : 'Dentist',
    url: abs(localizePath(locale, 'about')),
    knowsLanguage: ['he', 'ar', 'en'],
    worksFor: { '@id': abs(ID.clinic) },
  });

  const current = services.find((s) => pathname === localizePath(locale, `treatments/${s.slug}`));

  /* ---- WebPage (one per locale page) ---------------------------------- */
  const profile = pageType === 'ProfilePage';
  nodes.push({
    '@type': pageType,
    '@id': abs(`${pathname}#webpage`),
    url: abs(pathname),
    name: title,
    description,
    inLanguage: locale, // aligns with <html lang> and hreflang
    isPartOf: { '@id': abs(ID.website) },
    about: { '@id': abs(ID.clinic) },
    // A treatment page is ABOUT that treatment, offered by the clinic; the
    // about page is the doctor's profile.
    ...(current ? { mainEntity: { '@id': serviceId(current.slug) } } : {}),
    ...(profile ? { mainEntity: { '@id': abs(ID.doctor) } } : {}),
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
