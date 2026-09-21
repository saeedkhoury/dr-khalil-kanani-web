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
      display: '04-884-8891',
      tel: '+97248848891',
      schema: '+972-4-884-8891',
    },
    /** Mobile / WhatsApp. VERIFIED: flyer + Instagram bio + post footer agree. */
    mobile: {
      display: '052-288-5179',
      tel: '+972522885179',
      /** wa.me requires international format with no '+' and no leading zero. */
      whatsapp: '972522885179',
      schema: '+972-52-288-5179',
    },
  },

  /** UNVERIFIED — clinic has no published email address. Owner must supply. */
  email: '',

  /* ------------------------------------------------------------------------ */
  /*  Location                                                                 */
  /* ------------------------------------------------------------------------ */

  address: {
    /**
     * UNVERIFIED. Instagram lists "1003, Judaydah, Hazafon, Israel 2510500"
     * and a post footer reads "ג'דיידה מכר". "1003" is a plot number, not a
     * street. Owner must supply the exact address as it will appear on Google
     * Business Profile, plus a verified map pin.
     *
     * One canonical form per script. Transliteration drift across listings is
     * the single most common NAP failure in Israel.
     */
    street: { he: '', ar: '', en: '' },
    locality: {
      he: 'ג׳דיידה-מכר',
      ar: 'الجديدة-المكر',
      en: 'Jadeidi-Makr',
    },
    region: { he: 'מחוז הצפון', ar: 'لواء الشمال', en: 'Northern District' },
    postalCode: '2510500',
    country: 'IL',
    /** UNVERIFIED — must come from a confirmed map pin, never geocoded blindly. */
    geo: { lat: 0, lng: 0 },
  },

  /* ------------------------------------------------------------------------ */
  /*  Hours — Sunday-first, per the Israeli working week.                      */
  /*  PLACEHOLDER. Owner must supply. Do not guess clinic hours.               */
  /* ------------------------------------------------------------------------ */

  hours: [
    { day: 'Sunday', opens: '', closes: '', closed: false },
    { day: 'Monday', opens: '', closes: '', closed: false },
    { day: 'Tuesday', opens: '', closes: '', closed: false },
    { day: 'Wednesday', opens: '', closes: '', closed: false },
    { day: 'Thursday', opens: '', closes: '', closed: false },
    { day: 'Friday', opens: '', closes: '', closed: false },
    { day: 'Saturday', opens: '', closes: '', closed: true },
  ],

  /* ------------------------------------------------------------------------ */
  /*  Social                                                                   */
  /* ------------------------------------------------------------------------ */

  social: {
    instagram: 'https://www.instagram.com/dr.khalil.kanani',
    /**
     * Google Business Profile. UNVERIFIED — no profile was found during
     * discovery and the clinic may not have claimed one yet.
     *
     * This is where patient reviews live. Israeli dental advertising
     * regulations prohibit publishing patient identities on the clinic's own
     * site, so the site LINKS OUT here rather than republishing reviews
     * (ADR 0005). Until this is set, the feedback block does not render.
     */
    googleBusiness: '',
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
  { tier: Verification; blocking: boolean; note?: string }
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
  'address.street': { tier: 'placeholder', blocking: true, note: 'Owner must supply.' },
  'address.locality': { tier: 'owner', blocking: false, note: 'IG address + post footer' },
  'address.geo': { tier: 'placeholder', blocking: true, note: 'Needs confirmed map pin.' },
  hours: { tier: 'placeholder', blocking: true, note: 'Owner must supply. Never guess.' },
  siteUrl: { tier: 'placeholder', blocking: true, note: 'Owner must confirm domain.' },
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

/** True once a Google Business Profile URL has been supplied. */
export function hasGoogleProfile(): boolean {
  return clinic.social.googleBusiness.trim() !== '';
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
 * Waze deep link. Coordinates only — Waze's address search is unreliable for
 * Israeli Arab localities where plot numbers are used instead of street names,
 * and sending a patient to the wrong place is the failure mode to avoid.
 */
export function wazeUrl(): string | null {
  if (!hasGeo()) return null;
  return `https://waze.com/ul?ll=${clinic.address.geo.lat},${clinic.address.geo.lng}&navigate=yes`;
}
