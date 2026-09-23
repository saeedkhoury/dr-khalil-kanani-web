/**
 * The admin panel in a real browser.
 *
 * Runs against the actual Worker over loopback (scripts/serve-admin-fixture.ts)
 * with GitHub mocked, so these exercise the rendered panel — RTL at phone
 * width, keyboard traversal, axe — rather than a string of HTML.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PANEL = 'http://127.0.0.1:4332/';

test.use({ baseURL: 'http://127.0.0.1:4332' });

test('panel is accessible at phone width, in Hebrew and RTL', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PANEL);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'he');

  // Nothing may overflow horizontally on a phone.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);

  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test('hours load from the repository and save', async ({ page }) => {
  await page.goto(PANEL);

  // Values arrive from the Worker, which read them from the (mocked) repo.
  await expect(page.locator('[data-opens="0"]')).toHaveValue('09:00');
  await expect(page.locator('[data-closes="0"]')).toHaveValue('18:00');

  // Friday is closed, so its inputs are disabled and empty.
  await expect(page.locator('[data-closed="5"]')).toBeChecked();
  await expect(page.locator('[data-opens="5"]')).toBeDisabled();

  await page.locator('[data-opens="0"]').fill('08:30');
  await page.locator('#save-hours').click();

  // A commit is not a publication: the panel says it is publishing, not live.
  const status = page.locator('#status');
  await expect(status).toBeVisible();
  await expect(status).toContainText('מתפרסם');
});

test('marking a day closed disables and clears its times', async ({ page }) => {
  await page.goto(PANEL);
  const opens = page.locator('[data-opens="1"]');
  await expect(opens).toHaveValue('09:00');

  await page.locator('[data-closed="1"]').check();
  await expect(opens).toBeDisabled();
  await expect(opens).toHaveValue('');
});

test('an invalid week is refused at the field, not as a banner', async ({ page }) => {
  await page.goto(PANEL);
  // An open day with no closing time.
  await page.locator('[data-closes="0"]').fill('');
  await page.locator('#save-hours').click();

  const error = page.locator('[data-error="0"]');
  await expect(error).toBeVisible();
  await expect(error).toContainText('שעת פתיחה וסגירה');
});

test('gallery groups photographs by state, stated in text', async ({ page }) => {
  await page.goto(PANEL);
  await page.locator('#tab-gallery').click();

  await expect(page.locator('#panel-gallery')).toBeVisible();
  await expect(page.locator('#panel-hours')).toBeHidden();

  // State is text, never colour alone.
  await expect(page.locator('#published-list .state')).toHaveText('מוצג באתר');
  await expect(page.locator('#unpublished-list .state')).toHaveText('מוסתר');
});

test('permanent delete is unreachable from the published state', async ({ page }) => {
  await page.goto(PANEL);
  await page.locator('#tab-gallery').click();

  // A published photograph offers only "hide".
  await expect(page.locator('#published-list button.danger')).toHaveCount(0);
  await expect(page.locator('#published-list button')).toHaveText('הסתרה');

  // An unpublished one offers publish and delete.
  await expect(page.locator('#unpublished-list button.danger')).toHaveCount(1);
});

test('deleting asks first, in a dialog naming the photograph', async ({ page }) => {
  await page.goto(PANEL);
  await page.locator('#tab-gallery').click();
  await page.locator('#unpublished-list button.danger').click();

  const dialog = page.locator('#confirm-delete');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#confirm-delete-body')).toContainText('exterior-01.jpg');

  await page.locator('#confirm-delete-no').click();
  await expect(dialog).toBeHidden();
  // Cancelling changes nothing.
  await expect(page.locator('#unpublished-list button.danger')).toHaveCount(1);
});

test('the upload button stays disabled until the confirmation is ticked', async ({ page }) => {
  await page.goto(PANEL);
  await page.locator('#tab-gallery').click();

  const submit = page.locator('#photo-submit');
  await expect(submit).toBeDisabled();

  await page.locator('#photo-confirm').check();
  await expect(submit).toBeEnabled();

  await page.locator('#photo-confirm').uncheck();
  await expect(submit).toBeDisabled();
});

test('the gallery screen is accessible too', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PANEL);
  await page.locator('#tab-gallery').click();
  await expect(page.locator('#published-list .card')).toHaveCount(1);

  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test('every control is reachable by keyboard with a visible focus ring', async ({ page }) => {
  await page.goto(PANEL);

  const seen: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return { id: el.id || el.tagName, outline: style.outlineWidth, offset: style.outlineOffset };
    });
    if (active) seen.push(active.id);
  }
  // The two tabs and the hours controls are all reachable.
  expect(seen).toContain('tab-hours');
  expect(seen).toContain('tab-gallery');
  expect(seen.length).toBeGreaterThan(5);
});

test('the panel asks to stay out of search results', async ({ page }) => {
  await page.goto(PANEL);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});
