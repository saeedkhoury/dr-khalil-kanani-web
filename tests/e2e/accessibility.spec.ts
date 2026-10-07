/**
 * The accessibility panel, keyboard focus, and the statement link.
 *
 * Public-site behaviour only: the panel is presentation preferences on top of
 * markup that is already accessible (axe runs on every page in site.spec.ts).
 * These tests pin what a person relying on a keyboard, a larger font or less
 * motion actually experiences — and that a visitor who never touches the
 * button gets the site exactly as designed.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const locales = ['he', 'ar', 'en'] as const;
const FOOTER_LABEL = { he: 'הצהרת נגישות', ar: 'بيان إمكانية الوصول', en: 'Accessibility Statement' } as const;
const OPEN_LABEL = { he: 'הגדרות נגישות', ar: 'إعدادات إمكانية الوصول', en: 'Accessibility settings' } as const;
const PAGES = ['', 'about/', 'treatments/', 'treatments/dental-implants/', 'faq/', 'contact/', 'accessibility/'];

const a11yAttributes = (page: Page) =>
  page.evaluate(() => document.documentElement.getAttributeNames().filter((n) => n.startsWith('data-a11y-')));
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

for (const locale of locales) {
  test(`${locale}: footer links the statement by its exact name; the statement is complete`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    const link = page.locator('footer').getByRole('link', { name: FOOTER_LABEL[locale], exact: true });
    await expect(link).toHaveAttribute('href', `/${locale}/accessibility/`);
    await link.click();
    await expect(page.locator('h1')).toHaveText(FOOTER_LABEL[locale]);
    const text = await page.locator('main').innerText();
    expect(text).toContain('5568');
    expect(text).toContain('AA');
    expect(text).toContain('2026-10-07');
    // The clinic's phone is the reporting channel.
    await expect(page.locator('main a[href^="tel:"]')).toHaveCount(1);
    // Physical accessibility is not invented: no claim of parking, ramps, lifts or toilets being accessible.
    expect(text).not.toMatch(/חניית נכים|מעלית|רמפה|accessible parking|wheelchair|elevator|ramp|موقف لذوي|مصعد/i);
  });

  test(`${locale}: desktop — keyboard opens, traps, closes with Escape and returns focus`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/${locale}/`);
    expect(await a11yAttributes(page)).toEqual([]);
    expect(await page.evaluate(() => localStorage.length)).toBe(0);

    const fab = page.locator('.a11y-fab');
    await expect(fab).toBeVisible();
    await expect(fab).toHaveAccessibleName(OPEN_LABEL[locale]);
    const box = (await fab.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    await fab.focus();
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(fab).toHaveAttribute('aria-expanded', 'true');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    // Focus never reaches the page behind the panel however far you tab. (A
    // native modal lets Tab move on to the browser's own toolbar after the
    // last control — that is not a trap, and <body> is what the page sees.)
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((d) => d.contains(document.activeElement) || document.activeElement === document.body)).toBe(true);
    }
    expect((await new AxeBuilder({ page }).include('#a11y-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(fab).toBeFocused();
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
  });

  test(`${locale}: every preference applies, persists before paint, and resets`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/${locale}/`);
    await page.locator('.a11y-fab').click();
    const dialog = page.getByRole('dialog');

    const larger = dialog.locator('[data-a11y-step="1"]');
    await larger.click();
    await larger.click();
    await expect(dialog.locator('output')).toHaveText('130%');
    await expect(larger).toBeDisabled();
    // 130% of the 16px default (WebKit reports 20.799999px).
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(20.8, 1);

    for (const key of ['contrast', 'links', 'motion']) {
      const toggle = dialog.locator(`[data-a11y-toggle="${key}"]`);
      await toggle.press('Space');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    }
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-muted').trim())).toBe('#0f2a3d');
    expect(await page.locator('footer a').first().evaluate((a) => getComputedStyle(a).textDecorationLine)).toContain('underline');

    // Applied by the head script before the page paints, not after.
    await page.reload();
    expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(1);
    expect((await a11yAttributes(page)).sort()).toEqual(['data-a11y-contrast', 'data-a11y-links', 'data-a11y-motion', 'data-a11y-text']);
    // Stopped motion: content is visible immediately, nothing waits to fade in.
    expect(await page.locator('.reveal').first().evaluate((e) => getComputedStyle(e).opacity)).toBe('1');

    await page.locator('.a11y-fab').click();
    await expect(page.getByRole('dialog').locator('[data-a11y-toggle="contrast"]')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('dialog').locator('[data-a11y-reset]').click();
    expect(await a11yAttributes(page)).toEqual([]);
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    await expect(page.getByRole('dialog').locator('output')).toHaveText('100%');
  });

  for (const width of [375, 768, 1024, 1440]) {
    test(`${locale} at ${width}px: the largest text step never scrolls sideways`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => localStorage.setItem('kanani-a11y', JSON.stringify({ text: 2 })));
      for (const route of PAGES) {
        await page.goto(`/${locale}/${route}`);
        await expect(page.locator('html')).toHaveAttribute('data-a11y-text', '2');
        expect(await noHorizontalScroll(page), `${route} at ${width}px`).toBe(true);
        // The compact menu replaces the full row, so navigation is still reachable.
        await expect(page.locator('.header-compact summary')).toBeVisible();
      }
    });
  }

  test(`${locale}: phone — the button lives in the action bar; elsewhere it clears the bar`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/${locale}/`);
    const inBar = page.locator('nav [data-a11y-open]');
    await expect(inBar).toBeVisible();
    await expect(inBar).toHaveAccessibleName(OPEN_LABEL[locale]);
    await expect(page.locator('.a11y-fab')).toBeHidden();
    await inBar.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Measured once the opening transition has settled.
    await expect.poll(async () => { const b = (await dialog.boundingBox())!; return Math.round(b.y + b.height); }).toBeLessThanOrEqual(812);
    expect((await dialog.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    await dialog.locator('[data-a11y-close]').click();
    await expect(inBar).toBeFocused();

    // The contact page has no action bar: the corner button appears instead.
    await page.goto(`/${locale}/contact/`);
    await expect(page.locator('.a11y-fab')).toBeVisible();
  });

  test(`${locale}: phone — keyboard focus is never hidden behind the header or action bar`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    for (const route of ['', 'faq/', 'treatments/']) {
      await page.goto(`/${locale}/${route}`);
      for (let i = 0; i < 40; i += 1) {
        await page.keyboard.press('Tab');
        const hidden = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body || el.closest('header, .fixed, dialog') || el.matches('[data-a11y-open]')) return null;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return null;
          const x = r.left + r.width / 2;
          const y = r.top + Math.min(r.height / 2, 10);
          const top = document.elementFromPoint(x, y);
          return top && !el.contains(top) && !top.contains(el) && top.closest('header, .fixed') ? el.textContent?.trim().slice(0, 40) : null;
        });
        expect(hidden, `${route}: focused "${hidden}" is covered`).toBeNull();
      }
    }
  });
}
