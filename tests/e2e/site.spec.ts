import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { clinic } from '../../src/data/clinic';
import { gallery as publishedGallery } from '../../src/data/media';

const locales = ['he', 'ar', 'en'] as const;
const routes = ['', 'about/', 'contact/', 'faq/', 'privacy/', 'accessibility/', 'treatments/',
  ...['clear-aligners', 'dental-implants', 'emergency-dental', 'root-canal', 'teeth-whitening', 'veneers']
    .map((slug) => `treatments/${slug}/`)];

for (const locale of locales) {
  test(`${locale}: clinic work photographs, source links and full-size navigation`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}/`);
    const gallery = page.locator('section[aria-labelledby="gallery-heading"]');
    const tiles = gallery.locator('[data-gallery-open]');
    await expect(gallery).toHaveAttribute('data-gallery-kind', 'work');
    await expect(tiles).toHaveCount(3);
    for (const [index, asset] of publishedGallery.entries()) {
      await expect(gallery.locator('[data-gallery-source]').nth(index)).toHaveAttribute('href', asset.sourcePostUrl!);
      await expect(tiles.nth(index).locator('img')).toHaveCSS('object-fit', 'contain');
    }
    await gallery.scrollIntoViewIfNeeded();
    for (const image of await tiles.locator('img').all()) {
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    }
    await tiles.first().click();
    const dialog = page.locator('#gallery-lightbox');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#lightbox-position')).toHaveText('1 / 3');
    await expect(page.locator('#lightbox-source')).toHaveAttribute('href', publishedGallery[0].sourcePostUrl!);
    await expect(page.locator('#lightbox-source')).toBeVisible();
    await expect.poll(() => page.locator('#lightbox-image').evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    await page.locator('[data-gallery-next]').click();
    await expect(page.locator('#lightbox-position')).toHaveText('2 / 3');
    await expect(page.locator('#lightbox-source')).toHaveAttribute('href', publishedGallery[1].sourcePostUrl!);
    await expect(page.locator('#lightbox-image')).toHaveAttribute('alt', await tiles.nth(1).getAttribute('aria-label') ?? '');
    await page.locator('[data-gallery-prev]').click();
    await expect(page.locator('#lightbox-position')).toHaveText('1 / 3');
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(tiles.first()).toBeFocused();
  });

  test(`${locale}: hero logo stays top-left and follows mouse only when motion is allowed`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/${locale}/`);
    const logo = page.locator('[data-hero-logo]');
    const object = page.locator('[data-logo-object]');
    const box = await logo.boundingBox();
    const heading = await page.locator('#hero-heading').boundingBox();
    expect(box).not.toBeNull();
    expect(heading).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThan(heading!.x);
    expect(box!.y).toBeLessThan(heading!.y);
    await page.mouse.move(300, 250);
    await expect(object).toHaveAttribute('style', /--logo-ry:/);
    const first = await object.getAttribute('style');
    await page.mouse.move(1000, 400);
    await expect.poll(() => object.getAttribute('style')).not.toBe(first);
    await page.mouse.move(0, 0);
    await expect.poll(() => object.evaluate((element) => element.style.getPropertyValue('--logo-ry'))).toBe('');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.move(300, 250);
    await page.mouse.move(1000, 400);
    await expect.poll(() => object.evaluate((element) => element.style.getPropertyValue('--logo-ry'))).toBe('');
    await expect(logo).toBeVisible();
  });

  for (const width of [375, 768, 1440]) {
    test(`${locale} at ${width}px: every page, axe, overflow and local resources`, async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const failures: string[] = [];
      page.on('pageerror', (error) => failures.push(error.message));
      page.on('response', (response) => {
        if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
      });
      page.on('request', (request) => {
        if (!request.url().startsWith('http://127.0.0.1:4330/')) failures.push(`External request: ${request.url()}`);
      });
      for (const route of routes) {
        await page.goto(`/${locale}/${route}`);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('html')).toHaveAttribute('dir', locale === 'en' ? 'ltr' : 'rtl');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
        await expect(page.locator('h1')).toHaveCount(1);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(results.violations, `${locale}/${route} at ${width}px`).toEqual([]);
        if (route === '' || route === 'contact/') {
          await page.screenshot({ path: testInfo.outputPath(`${route === '' ? 'home' : 'contact'}.png`), fullPage: true });
        }
        if (width === 375) {
          await page.locator('footer').scrollIntoViewIfNeeded();
          await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
          const clear = await page.evaluate(() => {
            const footer = document.querySelector('footer');
            const bar = document.querySelector('body > .fixed');
            return !bar || !footer || footer.getBoundingClientRect().bottom <= bar.getBoundingClientRect().top;
          });
          expect(clear, `${route}: footer clears mobile bar`).toBe(true);
        }
      }
      expect(failures).toEqual([]);
    });
  }

  test(`${locale}: keyboard menu, language switching and appointment validation`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/${locale}/contact/`);
    const menu = page.locator('header details').last();
    await menu.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    await expect(menu.locator('nav a')).toHaveCount(5);
    await menu.locator('summary').click();
    const language = page.locator('header details').first();
    await language.locator('summary').click();
    for (const target of locales) {
      await expect(language.locator(`a[hreflang="${target}"]`)).toHaveAttribute('href', `/${target}/contact/`);
    }
    await language.locator('a[hreflang="en"]').click();
    await expect(page).toHaveURL('/en/contact/');
    await page.goto(`/${locale}/contact/`);
    await expect(page.locator('#f-consent')).not.toBeChecked();
    await page.locator('#f-submit').click();
    await expect(page.locator('#error-summary')).toBeFocused();
    await expect(page.locator('#error-summary-list li')).toHaveCount(3);
    await page.locator('#f-name').fill('QA Test');
    await page.locator('#f-phone').fill('123');
    await page.locator('#f-submit').click();
    await expect(page.locator('#f-phone')).toHaveAttribute('aria-invalid', 'true');
    await page.locator('#f-phone').fill('0501234567');
    await page.locator('#f-submit').click();
    await expect(page.locator('#error-summary-list li')).toHaveCount(1);
    await page.locator('#f-consent').check();
    // Intercept the handoff locally; no message or personal data leaves the browser.
    await page.context().route('https://wa.me/**', (route) => route.fulfill({ body: '<title>Local WhatsApp handoff test</title>' }));
    const popup = page.waitForEvent('popup');
    await page.locator('#f-submit').click();
    const handoff = await popup;
    await handoff.waitForURL('https://wa.me/**');
    expect(await handoff.evaluate(() => window.opener)).toBeNull();
    const url = new URL(handoff.url());
    expect(url.pathname).toBe(`/${clinic.phone.mobile.whatsapp}`);
    expect(url.searchParams.get('text')).toContain('QA Test');
    expect(url.searchParams.get('text')).toContain('0501234567');
    await expect(page.locator('#form-success')).toBeVisible();
    await expect(page).toHaveURL(`/${locale}/contact/`);
    await handoff.close();

    // A blocked popup must still provide a working handoff in the same tab.
    await page.goto(`/${locale}/contact/`);
    await page.evaluate(() => { window.open = () => null; });
    await page.locator('#f-name').fill('QA Test');
    await page.locator('#f-phone').fill('0501234567');
    await page.locator('#f-consent').check();
    await page.locator('#f-submit').click();
    await page.waitForURL('https://wa.me/**');
  });

  test(`${locale}: desktop consent click survives blur validation`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}/contact/`);
    await page.locator('#f-phone').fill('123');
    await page.locator('#f-consent').check();
    await expect(page.locator('#f-phone-error')).toBeVisible();
    await page.locator('#f-consent').uncheck();
    await page.locator('#f-submit').click();
    await page.locator('#f-name').fill('QA Test');
    await page.locator('#f-phone').fill('0501234567');
    await page.locator('#f-consent').check();
    await expect(page.locator('#f-consent')).toBeChecked();
    await expect(page.locator('#f-phone-error')).toBeHidden();
    await expect(page.locator('#f-phone')).not.toHaveAttribute('aria-describedby');
  });

  test(`${locale}: owner-supplied destination and opt-in Google map`, async ({ page }) => {
    await page.goto(`/${locale}/contact/`);
    const location = page.locator('section[aria-labelledby="location-heading"]');
    await expect(location).toContainText(clinic.address.street[locale]);
    await expect(location.locator('a[href^="https://waze.com/"]')).toHaveAttribute('href', clinic.address.waze);
    await expect(location.locator('a[href^="https://www.google.com/maps/"]')).toHaveAttribute(
      'href', `https://www.google.com/maps/search/?api=1&query=${clinic.address.geo.lat},${clinic.address.geo.lng}`,
    );
    await expect(page.locator('#map-facade iframe')).toHaveCount(0);
    await page.route('https://www.google.com/**', (route) => route.fulfill({ body: '<title>Intercepted Google map</title>' }));
    await page.locator('#map-facade-load').click();
    await expect(page.locator('#map-facade iframe')).toHaveAttribute(
      'src', `https://www.google.com/maps?q=${clinic.address.geo.lat},${clinic.address.geo.lng}&z=16&hl=${locale}&output=embed`,
    );
    await expect(page.locator('#map-facade iframe')).toHaveClass(/is-loaded/);
  });

  test(`${locale}: motion fails visible and no-JS contact fallback works`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4330/${locale}/`);
    for (const element of await page.locator('.reveal, .enter').all()) await expect(element).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-hero-logo]')).toBeVisible();
    await expect(page.locator('[data-gallery-open]')).toHaveCount(3);
    await page.goto(`http://127.0.0.1:4330/${locale}/contact/`);
    await expect(page.locator('noscript a[href^="tel:"]')).toBeVisible();
    await expect(page.locator('noscript a[href^="https://wa.me/"]')).toBeVisible();
    await expect(page.locator('#map-facade-load')).toBeHidden();
    await expect(page.locator('section[aria-labelledby="location-heading"] a[href^="https://waze.com/"]')).toBeVisible();
    await context.close();
    const animated = await browser.newPage();
    await animated.goto(`http://127.0.0.1:4330/${locale}/`);
    for (const element of await animated.locator('.reveal, .enter').all()) await expect(element).toHaveCSS('opacity', '1');
    await animated.close();

    const broken = await browser.newPage();
    await broken.addInitScript(() => {
      window.IntersectionObserver = class {
        constructor() { throw new Error('Simulated observer initialization failure'); }
      } as unknown as typeof IntersectionObserver;
    });
    await broken.goto(`http://127.0.0.1:4330/${locale}/`);
    for (const element of await broken.locator('.reveal, .enter').all()) await expect(element).toHaveCSS('opacity', '1');
    await expect(broken.locator('html')).not.toHaveClass(/js-reveal/);
    await broken.close();
  });
}

test('default homepage and not-found page are accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/', '/404.html']) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
});
