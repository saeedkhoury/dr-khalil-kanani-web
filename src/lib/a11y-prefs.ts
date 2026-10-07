/**
 * Presentation preferences from the accessibility panel
 * (src/components/sections/AccessibilityControl.astro).
 *
 * The site itself is built to be accessible; these are only optional
 * presentation choices on top of it. They are stored in the visitor's own
 * browser (localStorage, never sent anywhere, no cookie) and applied before
 * first paint as attributes on <html>, which global.css reads. A visitor who
 * never opens the panel gets no attributes — the site exactly as designed.
 *
 * parsePrefs and prefAttributes are self-contained on purpose: HEAD_SCRIPT is
 * built from their source, so the pre-paint script and the panel can never
 * disagree about what a stored value means.
 */

export interface A11yPrefs {
  /** Index into TEXT_STEPS. */
  text: number;
  contrast: boolean;
  links: boolean;
  motion: boolean;
}

export const PREFS_KEY = 'kanani-a11y';

/**
 * Root text scale per step. Kept modest: beyond 130% the layout itself must
 * change, which browser zoom already does properly (it moves breakpoints).
 */
export const TEXT_STEPS = [1, 1.15, 1.3] as const;

export const DEFAULT_PREFS: A11yPrefs = { text: 0, contrast: false, links: false, motion: false };

/** Stored JSON → preferences. Anything malformed falls back to the default. */
export function parsePrefs(raw: string | null): A11yPrefs {
  const out = { text: 0, contrast: false, links: false, motion: false };
  if (!raw) return out;
  let data;
  try { data = JSON.parse(raw); } catch (e) { return out; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
  if (data.text === 0 || data.text === 1 || data.text === 2) out.text = data.text;
  if (data.contrast === true) out.contrast = true;
  if (data.links === true) out.links = true;
  if (data.motion === true) out.motion = true;
  return out;
}

/** Preferences → attributes for <html>. Defaults produce none. */
export function prefAttributes(prefs: A11yPrefs): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (prefs.text > 0) attrs['data-a11y-text'] = String(prefs.text);
  if (prefs.contrast) attrs['data-a11y-contrast'] = '';
  if (prefs.links) attrs['data-a11y-links'] = '';
  if (prefs.motion) attrs['data-a11y-motion'] = '';
  return attrs;
}

/** Inline <head> script: applies stored preferences before the first paint. */
export const HEAD_SCRIPT =
  'try{var a=(' + prefAttributes.toString() + ')((' + parsePrefs.toString() + ')(localStorage.getItem(' +
  JSON.stringify(PREFS_KEY) + ')));for(var k in a)document.documentElement.setAttribute(k,a[k]);}catch(e){}';
