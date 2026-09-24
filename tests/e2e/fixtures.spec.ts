import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['he', 'ar', 'en']) {
  test(`${locale}: populated gallery, rating and click-to-load map`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const external: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:4331/')) external.push(request.url());
    });
    await page.goto(`http://127.0.0.1:4331/${locale}/`);
    await expect(page.locator('[data-gallery-open]')).toHaveCount(2);
    await expect(page.locator('#map-facade iframe')).toHaveCount(0);
    expect(external).toEqual([]);
    const feedback = page.locator('section[aria-labelledby="feedback-heading"]');
    await expect(feedback).toContainText('4.5');
    await expect(feedback).toContainText('12');
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);

    const tile = page.locator('[data-gallery-open="0"]');
    await tile.click();
    const dialog = page.locator('#gallery-lightbox');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#lightbox-image')).toHaveAttribute('alt', await tile.getAttribute('aria-label') ?? '');
    await expect(page.locator('#lightbox-position')).toHaveText('1 / 2');
    await page.keyboard.press(locale === 'en' ? 'ArrowRight' : 'ArrowLeft');
    await expect(page.locator('#lightbox-position')).toHaveText('2 / 2');
    await page.locator('[data-gallery-next]').click();
    await expect(page.locator('#lightbox-position')).toHaveText('1 / 2');
    await page.locator('[data-gallery-prev]').click();
    await expect(page.locator('#lightbox-position')).toHaveText('2 / 2');
    for (let index = 0; index < 5; index++) {
      await page.keyboard.press('Tab');
      // Native dialogs may tab into browser chrome (activeElement becomes
      // body); no background page control may receive focus.
      expect(await dialog.evaluate((element) => element.matches(':modal') &&
        (element.contains(document.activeElement) || document.activeElement === document.body))).toBe(true);
    }
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(tile).toBeFocused();

    // The request is intercepted, so Google never receives the synthetic pin.
    await page.route('https://www.google.com/**', (route) => route.fulfill({ body: '<title>Local map fixture</title>' }));
    await page.locator('#map-facade-load').click();
    await expect(page.locator('#map-facade iframe')).toHaveAttribute('src', new RegExp(`q=1,1.*hl=${locale}`));
    await expect(page.locator('#map-facade iframe')).toHaveClass(/is-loaded/);
    expect(external).toHaveLength(1);
  });
}

for (const locale of ['he', 'ar', 'en']) {
  for (const width of [375, 1440]) {
    test(`${locale} ${width}: clinic photography is published only on About with locale fallback`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`http://127.0.0.1:4331/${locale}/about/`);
      const gallery = page.locator('[data-gallery-kind="clinic"]');
      await expect(gallery).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'en' ? 'ltr' : 'rtl');
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(gallery.locator('[data-gallery-open]')).toHaveCount(2);
      const alt = locale === 'he' ? 'סמל מרפאה 1' : locale === 'ar' ? 'رمز العيادة 1' : 'Clinic test mark 1';
      await expect(gallery.locator('[data-gallery-open="0"] img')).toHaveAttribute('alt', alt);
      await expect(gallery.locator('[aria-label="סמל מרפאה 3"], [aria-label="رمز العيادة 3"]')).toHaveCount(0);
      await expect(page.locator('[data-gallery-kind="work"]')).toHaveCount(0);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
      await gallery.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/clinic-${locale}-${width}.png`, fullPage: true });
      const tile = gallery.locator('[data-gallery-open="0"]');
      await tile.click();
      await expect(page.locator('#lightbox-image')).toHaveAttribute('alt', alt);
      await page.keyboard.press(locale === 'en' ? 'ArrowRight' : 'ArrowLeft');
      await expect(page.locator('#lightbox-position')).toHaveText('2 / 2');
      await page.keyboard.press('Escape');
      await expect(tile).toBeFocused();
      await page.goto(`/${locale}/about/`);
      await expect(page.locator('[data-gallery-kind="clinic"]')).toHaveCount(0);
      await expect(page.locator('#gallery-lightbox')).toHaveCount(0);
    });
  }
}
