/**
 * Automatic publication, as the doctor would see it in PRODUCTION.
 *
 * The fixture on :4333 is the same Worker with its content branch set to
 * 'main'. GitHub is mocked; so is the OFFICIAL site's build.txt, which changes
 * only when this test says the public deploy has finished. The point: "Live"
 * is claimed only when the official site serves the saved commit — never when
 * a commit exists, and never when a workflow merely reports success.
 */

import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:4333', reducedMotion: 'reduce' });
test.describe.configure({ mode: 'serial' });

test('a saved photo change is "Live" only once the official site serves that commit', async ({ page, request }) => {
  test.setTimeout(90_000);
  page.on('dialog', (d) => void d.accept());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/he/about/');
  await expect(page.locator('.visual-bar-status')).not.toContainText('מצב בדיקה');
  await page.locator('.gallery-title-row .visual-edit-control').click();
  const pm = page.locator('dialog.pm');
  const tiles = pm.locator('.pm-grid > .pm-tile:not(.pm-add)');
  await expect(tiles.first()).toBeVisible();
  // Production wording: saving publishes.
  await expect(pm.locator('.pm-save')).toHaveText('שמירה ופרסום');

  await tiles.nth(0).locator('.pm-keyboard button').last().focus();
  await page.keyboard.press('Enter');
  await pm.locator('.pm-save').click();

  const status = pm.locator('.pm-status');
  await expect(status).toContainText(/מפרסם את התמונות…|מעדכן את האתר…/, { timeout: 30_000 });
  // The deploy workflow "succeeded" (the mock says so at once), but the
  // official site still serves the old build: not Live.
  await page.waitForTimeout(9_000);
  await expect(status).toContainText('מעדכן את האתר…');
  await expect(status).not.toContainText('באוויר');

  // The public deploy finishes: the official site now serves the commit.
  await request.post('/__fixture/publish');
  await expect(status).toContainText('באוויר ✓ — האתר הרשמי מציג את השינוי', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-state', 'published');
});
