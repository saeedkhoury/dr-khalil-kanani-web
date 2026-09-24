/**
 * SINGLE SOURCE OF TRUTH for clinic identity, contact and location data.
 *
 * Consumed by: header, footer, contact page, JSON-LD, sitemap, sticky action bar.
 * NOTHING else in this codebase may hardcode a phone number, address or opening hour.
 *
 * Rationale: both reference clinics studied during discovery shipped THREE different
 * phone numbers across their own sites, and one linked Waze to the wrong street.
 * Centralising here makes that failure class structurally impossible.
 *
 * VERIFICATION TIERS — see docs/CONTENT.md. Enforced at build time by
 * `assertLaunchReady()` in src/lib/verify.ts, which fails a production build
 * while any launch-blocking field is still unverified.
 */

import hoursData from './hours.json' with { type: 'json' };
import contactData from './contact-facts.json' with { type: 'json' };
import { assertHoursShape, type OpeningHoursRow } from '../lib/data-schema.ts';
import { contactFactsSchema, parseManaged } from '../lib/managed-schema.ts';

const contact = parseManaged(contactFactsSchema, contactData, 'contact facts');
const digits = (value: string): string => value.replace(/\D/g, '');
const international = (value: string): string => `+972${digits(value).slice(1)}`;
const schemaPhone = (value: string): string => `+972-${value.slice(1)}`;

export type { OpeningHoursRow };

export type Verification =
  /** Confirmed by 2+ independent sources. Safe to publish. */
  | 'verified'
  /** Supplied by the clinic owner, single source. Safe to publish. */
  | 'owner'
  /** Inferred from public research. MUST be owner-confirmed before launch. */
  | 'unverified'
  /** Invented for layout only. MUST NOT ship under any circumstances. */
  | 'placeholder';

export const LOCALES = ['he', 'ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/* -------------------------------------------------------------------------- */
/*  Identity                                                                   */
/* -------------------------------------------------------------------------- */

export const clinic = {
  /** Doctor's name per locale. Latin form is the canonical transliteration — */
  /** it must never vary across the site, GBP or any citation. */
  doctor: {
    he: 'ד״ר חליל כנעאני',
    ar: 'د. خليل كنعاني',
    en: 'Dr. Khalil Kanani',
  },

  /** Full legal name. Instagram profile field only — single source. */
  doctorFullName: {
    he: 'ד״ר חליל אסעד כנעאני',
    ar: 'د. خليل أسعد كنعاني',
    en: 'Dr. Khalil As’ad Kanani',
  },

  /** Clinic descriptor, as it appears in the logo lockup and on the flyer. */
  tagline: {
    he: 'מרפאת שיניים ואסתטיקה',
    ar: 'عيادة أسنان وتجميل',
    en: 'Dental & Aesthetic Clinic',
  },

  /* ------------------------------------------------------------------------ */
  /*  Contact                                                                  */
  /* ------------------------------------------------------------------------ */

  phone: {
    /** Landline. VERIFIED: flyer + Instagram bio agree exactly. */
    landline: {
      display: contact.landline,
      tel: international(contact.landline),
      schema: schemaPhone(contact.landline),
    },
    /** Mobile / WhatsApp. VERIFIED: flyer + Instagram bio + post footer agree. */
    mobile: {
      display: contact.mobile,
      tel: international(contact.mobile),
      /** wa.me requires international format with no '+' and no leading zero. */
      whatsapp: international(contact.mobile).slice(1),
      schema: schemaPhone(contact.mobile),
    },
  },

  /** UNVERIFIED — clinic has no published email address. Owner must supply. */
  email: contact.email,

  /* ------------------------------------------------------------------------ */
  /*  Location                                                                 */
  /* ------------------------------------------------------------------------ */

  address: {
    /**
     * Owner supplied Street 1003 and https://waze.com/ul/hsvbgrg6s4 on
     * 2026-09-21. Waze resolves that link to 32.9336,35.148804.
     *
     * One canonical form per script. Transliteration drift across listings is
     * the single most common NAP failure in Israel.
     */
    street: contact.street,
    locality: contact.locality,
    region: contact.region,
    postalCode: contact.postalCode,
    country: 'IL',
    /** Coordinates resolved from the owner's Waze link, not an address search. */
    geo: { lat: 32.9336, lng: 35.148804 } as { readonly lat: number; readonly lng: number },
    waze: 'https://waze.com/ul/hsvbgrg6s4',
  },

  /* ------------------------------------------------------------------------ */
  /*  Hours — Sunday-first, per the Israeli working week.                      */
  /*                                                                          */
  /*  The ONLY clinic fact stored outside this file. It lives in hours.json    */
  /*  because it is the one fact the owner must be able to change himself,     */
  /*  and a file containing nothing but seven rows cannot be corrupted by      */
  /*  editing it the way a TypeScript module can.                              */
  /*                                                                          */
  /*  Validated on import: JSON has no compile-time shape, so a bad edit must  */
  /*  fail the build rather than render a wrong hour at a real clinic.         */
  /*                                                                          */
  /*  PLACEHOLDER until the owner supplies real hours. Do not guess them.      */
  /* ------------------------------------------------------------------------ */

  hours: assertHoursShape(hoursData),

  /* ------------------------------------------------------------------------ */
  /*  Social                                                                   */
  /* ------------------------------------------------------------------------ */

  /**
   * Appointment-request email relay (Cloudflare Worker).
   *
   * Empty = the form uses the WhatsApp handoff only, exactly as before. That
   * is the safe default: an unconfigured endpoint must never mean a silently
   * dropped request. See workers/appointment-email/README.md.
   *
   * Once deployed, set this to the Worker URL. The form then emails the
   * clinic and falls back to WhatsApp if the Worker is unreachable.
   */
  requestEndpoint: 'https://drkanani-appointment-email.saed-khoury10.workers.dev' as string,

  social: {
    instagram: contact.instagram,
    /** Hidden until the owner supplies the clinic’s exact Facebook page. */
    facebook: contact.facebook,
    /**
     * Google Business Profile. UNVERIFIED — no profile was found during
     * discovery and the clinic may not have claimed one yet.
     *
     * This is where patient reviews live. Israeli dental advertising
     * regulations prohibit publishing patient identities on the clinic's own
     * site, so the site LINKS OUT here rather than republishing reviews
     * (ADR 0005). Until this is set, the feedback block does not render.
     */
    googleBusiness: contact.googleBusiness,
  },

  /**
   * Google review aggregate.
   *
   * The RATING and COUNT only — never individual reviews. Israeli dental
   * advertising regulations prohibit publishing patient identities, so quotes,
   * names and dates stay on Google where the patient published them
   * (ADR 0005). An aggregate is Google's own published figure about the
   * business, not a patient's identity.
   *
   * These must be copied from the live Google Business Profile, never
   * estimated. Leave at null and the block does not render.
   *
   * NOTE: do NOT mirror these into AggregateRating structured data. Google
   * rules self-controlled review markup ineligible for stars and it risks a
   * manual action. See src/lib/schema.ts.
   */
  googleRating: {
    /** e.g. 4.9 — as displayed on the profile. */
    value: null as number | null,
    /** e.g. 27 */
    count: null as number | null,
    /** When these numbers were last copied across. */
    checkedOn: '' as string,
  },

  /** Production origin. Owner must confirm the domain. */
  siteUrl: 'https://example.invalid',
} as const;

/* -------------------------------------------------------------------------- */
/*  Verification manifest                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Status of every publishable fact above.
 * `blocking: true` means a production build MUST fail until the tier is
 * 'verified' or 'owner'. See src/lib/verify.ts.
 */
export const VERIFICATION: Record<
  string,
  {
    tier: Verification;
    blocking: boolean;
    note?: string;
    /**
     * Whether the value is actually RENDERED while unverified.
     *
     * `false` means a guard (hasAddress, hasHours, hasGeo...) hides it, so the
     * visitor sees nothing rather than something false. Absent information is
     * not a lie, so those warn instead of failing a production build.
     *
     * Defaults to true — a field must opt IN to being treated as hidden, so
     * forgetting the flag fails safe.
     */
    published?: boolean;
  }
> = {
  'doctor.he': { tier: 'verified', blocking: true, note: 'Logo + flyer + Instagram' },
  'doctor.ar': {
    tier: 'unverified',
    blocking: true,
    note: 'Arabic spelling inferred. No Arabic lockup exists. Owner must confirm.',
  },
  'doctor.en': {
    tier: 'unverified',
    blocking: true,
    note: 'Latin transliteration must be fixed by owner — every citation inherits it.',
  },
  'doctorFullName.he': {
    tier: 'owner',
    blocking: false,
    note: 'Instagram profile field, single source.',
  },
  'tagline.he': { tier: 'verified', blocking: true, note: 'Logo lockup + flyer + IG bio' },
  'tagline.ar': { tier: 'unverified', blocking: true, note: 'Translation needs native review.' },
  'tagline.en': { tier: 'unverified', blocking: false },
  'phone.landline': { tier: 'verified', blocking: true, note: 'Flyer + Instagram bio' },
  'phone.mobile': {
    tier: 'verified',
    blocking: true,
    note: 'Flyer + IG bio + post footer. WhatsApp presence NOT yet confirmed.',
  },
  email: { tier: 'placeholder', blocking: false, note: 'No published address found.' },
  'address.street': { tier: 'owner', blocking: true, note: 'Owner supplied Street 1003, Jadeidi-Makr on 2026-09-21.' },
  'address.locality': { tier: 'owner', blocking: false, note: 'IG address + post footer' },
  'address.geo': { tier: 'owner', blocking: true, note: 'Resolved from owner-supplied https://waze.com/ul/hsvbgrg6s4 on 2026-09-21.' },
  hours: {
    tier: 'placeholder',
    blocking: true,
    /**
     * DERIVED, never stored. hasHours() is what actually decides whether the
     * block renders, so a literal here drifts the moment the owner fills the
     * hours in — the gate would keep calling them hidden while they were on
     * screen. One authoritative value, read through a getter.
     */
    get published() {
      return hasHours();
    },
    note: 'Owner must supply. hasHours() hides the block.',
  },
  siteUrl: {
    tier: 'placeholder',
    blocking: true,
    published: false,
    note: 'Overridden by ASTRO_SITE in CI, so the placeholder never ships.',
  },
  'social.instagram': { tier: 'verified', blocking: false },
};

/* -------------------------------------------------------------------------- */
/*  Derived helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Pre-filled WhatsApp deep link. Discovery found WhatsApp is the dominant */
/** contact channel in Israel, so this is a primary conversion path.        */
export function whatsappUrl(message: string): string {
  return `https://wa.me/${clinic.phone.mobile.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function telUrl(which: 'landline' | 'mobile' = 'landline'): string {
  return `tel:${clinic.phone[which].tel}`;
}

/** True when the clinic has enough confirmed data to display opening hours. */
export function hasHours(): boolean {
  return clinic.hours.some((h) => !h.closed && h.opens !== '' && h.closes !== '');
}

/** True when a confirmed street address exists in the given locale. */
export function hasAddress(locale: Locale): boolean {
  return clinic.address.street[locale].trim() !== '';
}

/** True once the owner has confirmed a map pin. Never geocode a guess. */
export function hasGeo(): boolean {
  return clinic.address.geo.lat !== 0 && clinic.address.geo.lng !== 0;
}

/** True once the email relay has been deployed and wired up. */
export function hasRequestEndpoint(): boolean {
  return clinic.requestEndpoint.trim() !== '';
}

/** True once a Google Business Profile URL has been supplied. */
export function hasGoogleProfile(): boolean {
  return clinic.social.googleBusiness.trim() !== '';
}

/** True once a real rating AND count have been copied from the profile. */
export function hasGoogleRating(): boolean {
  const r = clinic.googleRating;
  return typeof r.value === 'number' && typeof r.count === 'number' && r.count > 0;
}

/**
 * Google Maps link.
 *
 * Prefers exact coordinates; falls back to a name+locality search so the link
 * is still useful once an address exists but a pin has not been confirmed.
 * Returns null when neither is known — a wrong map link is worse than none.
 * (One reference site sends patients to the wrong street on every page.)
 */
export function mapsUrl(locale: Locale): string | null {
  if (hasGeo()) {
    return `https://www.google.com/maps/search/?api=1&query=${clinic.address.geo.lat},${clinic.address.geo.lng}`;
  }
  if (hasAddress(locale)) {
    const q = encodeURIComponent(
      `${clinic.address.street[locale]} ${clinic.address.locality[locale]}`.trim(),
    );
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }
  return null;
}

/**
 * Preserve the exact owner-supplied Waze destination. Never search a guessed
 * address; use coordinates only when no shared destination link is available.
 */
export function wazeUrl(): string | null {
  if (clinic.address.waze) return clinic.address.waze;
  if (!hasGeo()) return null;
  return `https://waze.com/ul?ll=${clinic.address.geo.lat},${clinic.address.geo.lng}&navigate=yes`;
}
