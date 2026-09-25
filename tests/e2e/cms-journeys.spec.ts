/**
 * The doctor's journeys, end to end, in a real browser.
 *
 * Written after the owner found, by hand, that replacing a photograph and
 * editing a treatment did not work — while every earlier test passed. Those
 * tests checked that controls EXISTED. These do what a person does: find the
 * control on the page, use it, save, read the result, reopen, and check the
 * change is really there.
 *
 * The GitHub behind the fixture behaves like GitHub: real image bytes, and no
 * inline content for files over 1 MB (see scripts/serve-admin-fixture.ts).
 * Uploads here are ~5.7 MB PNGs, the size of a phone photo.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import services from '../../src/data/services.json' with { type: 'json' };
import { noisePng } from '../helpers/png.ts';

const ADMIN = 'http://127.0.0.1:4332';
test.use({ baseURL: ADMIN, reducedMotion: 'reduce' });
// One in-memory repository behind all of these; they build on each other.
test.describe.configure({ mode: 'serial' });

const heTitle = (slug: string) => services.find((s) => s.slug === slug)!.locales.he.title;
const heCard = (slug: string) => services.find((s) => s.slug === slug)!.locales.he.cardTitle;
const dialogOf = (page: Page) => page.locator('dialog.visual-dialog');
const statusOf = (page: Page) => dialogOf(page).locator('.visual-status');

async function acceptConfirms(page: Page) {
  page.on('dialog', (d) => void d.accept());
}

/** The element is inside the dialog's visible area — on screen, not 1,700px down. */
async function expectInView(dialog: Locator, target: Locator) {
  await expect(target).toBeVisible();
  const d = (await dialog.boundingBox())!;
  const t = (await target.boundingBox())!;
  expect(t.y).toBeGreaterThanOrEqual(d.y);
  expect(t.y + Math.min(t.height, 40)).toBeLessThanOrEqual(d.y + d.height);
}

async function dragOnto(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  for (const step of [0.3, 0.6, 1]) {
    await page.mouse.move(
      a.x + (b.x + b.width / 2 - a.x) * step,
      a.y + (b.y - a.y) * step + b.height * 0.25,
      { steps: 6 },
    );
  }
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => { await acceptConfirms(page); });

/* ── Treatments ─────────────────────────────────────────────────────────── */

test('a treatment card pencil opens THAT treatment, on screen, with its data', async ({ page }) => {
  await page.goto('/he/');
  await page.getByRole('button', { name: `עריכה: ${heCard('dental-implants')}`, exact: true }).click();
  const dialog = dialogOf(page);
  const heading = dialog.getByRole('heading', { name: `עריכת טיפול: ${heTitle('dental-implants')}` });
  await expectInView(dialog, heading);
  await expect(heading).toBeFocused();
  await expect(dialog.locator('[data-path$=".locales.he.title"]')).toHaveValue(heTitle('dental-implants'));
});

test('editing a treatment saves, saves again, and says when nothing changed', async ({ page }) => {
  await page.goto('/he/');
  await page.getByRole('button', { name: `עריכה: ${heCard('dental-implants')}`, exact: true }).click();
  const dialog = dialogOf(page);
  const summary = dialog.locator('[data-path$=".locales.he.summary"]');
  await summary.fill('תקציר שעודכן בבדיקה.');
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר (commit');

  // The second save in the same sitting used to be refused as a conflict.
  await summary.fill('תקציר שעודכן פעם שנייה.');
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר (commit');
  await expect(statusOf(page)).not.toContainText('השתנה');

  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('אין שינויים לשמירה');

  // Persisted: close, reopen from the page, the value is there.
  await dialog.getByRole('button', { name: 'סגירה' }).click();
  await page.getByRole('button', { name: `עריכה: ${heCard('dental-implants')}`, exact: true }).click();
  await expect(dialog.locator('[data-path$=".locales.he.summary"]')).toHaveValue('תקציר שעודכן פעם שנייה.');
});

test('"Edit this treatment" on a treatment page opens that treatment', async ({ page }) => {
  await page.goto('/he/treatments/veneers/');
  await page.getByRole('button', { name: 'עריכת הטיפול הזה' }).click();
  const dialog = dialogOf(page);
  await expectInView(dialog, dialog.getByRole('heading', { name: `עריכת טיפול: ${heTitle('veneers')}` }));
});

test('a new treatment saves as a draft; publishing it incomplete names what is missing', async ({ page }) => {
  await page.goto('/he/treatments/');
  await page.getByRole('button', { name: 'הוספת טיפול', exact: true }).click();
  const dialog = dialogOf(page);
  await expectInView(dialog, dialog.getByRole('heading', { name: 'עריכת טיפול: טיפול חדש' }));
  await dialog.locator('[data-path$=".slug"]').fill('test-crowns');
  await dialog.locator('[data-path$=".locales.he.title"]').fill('כתרים לבדיקה');
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר (commit');

  await dialog.getByRole('button', { name: 'הצגה באתר: כתרים לבדיקה' }).click();
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toHaveAttribute('data-state', 'error');
  const issue = dialog.locator('.visual-errors button').filter({ hasText: 'שם קצר לכרטיס (עברית)' });
  await expect(issue).toBeVisible();
  await expect(dialog.locator('.visual-errors')).not.toContainText('too_small');
  await issue.click();
  await expect(dialog.locator('[data-path$=".locales.he.cardTitle"]')).toBeFocused();
  // An error is not overwritten by a background status check.
  await page.waitForTimeout(6500);
  await expect(statusOf(page)).toHaveAttribute('data-state', 'error');

  // Hide it again and delete it: a saved-hidden draft can be removed.
  await dialog.getByRole('button', { name: 'הסתרה מהאתר: כתרים לבדיקה' }).click();
  await dialog.getByRole('button', { name: 'מחיקה: כתרים לבדיקה' }).click();
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר (commit');
  await expect(dialog.getByText('כתרים לבדיקה')).toHaveCount(0);
});

test('treatments reorder by dragging, and the order persists', async ({ page }) => {
  await page.goto('/he/');
  await page.locator('[data-edit-kind="services"]:not([data-edit-focus])').first().click();
  const dialog = dialogOf(page);
  const items = dialog.locator('.visual-sortable > .visual-item h3');
  const firstBefore = await items.nth(0).textContent();
  await dragOnto(page, items.nth(1).locator('.visual-grip'), items.nth(0));
  await expect(items.nth(1)).toHaveText(firstBefore!);
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר (commit');
  await dialog.getByRole('button', { name: 'סגירה' }).click();
  await page.locator('[data-edit-kind="services"]:not([data-edit-focus])').first().click();
  await expect(items.nth(1)).toHaveText(firstBefore!);
});

/* ── FAQ ────────────────────────────────────────────────────────────────── */

test('FAQ: add, edit, save, reopen, delete', async ({ page }) => {
  await page.goto('/he/');
  await page.getByRole('button', { name: 'עריכת שאלות נפוצות' }).click();
  const dialog = dialogOf(page);
  await dialog.getByRole('button', { name: '+ הוספת שאלה' }).click();
  const fresh = dialog.locator('.visual-item').filter({ hasText: 'שאלה חדשה' });
  await fresh.locator('[data-path$=".q.he"]').fill('שאלת בדיקה?');
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר (commit');

  await dialog.getByRole('button', { name: 'סגירה' }).click();
  await page.getByRole('button', { name: 'עריכת שאלות נפוצות' }).click();
  const saved = dialog.locator('.visual-item').filter({ hasText: 'שאלת בדיקה?' });
  await expect(saved).toContainText('מוסתר');
  await saved.getByRole('button', { name: 'מחיקה: שאלת בדיקה?' }).click();
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר (commit');
  await expect(dialog.getByText('שאלת בדיקה?')).toHaveCount(0);
});

/* ── Clinic photos: the photo manager ───────────────────────────────────── */

const managerOf = (page: Page) => page.locator('dialog.pm');
const tilesOf = (page: Page) => managerOf(page).locator('.pm-grid > .pm-tile:not(.pm-add)');
const filesOf = (page: Page) => tilesOf(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-file')));
const pmStatus = (page: Page) => managerOf(page).locator('.pm-status');

async function openManager(page: Page, locale = 'he') {
  await page.goto(`/${locale}/about/`);
  await page.locator('.gallery-title-row .visual-edit-control').click();
  await expect(tilesOf(page).first()).toBeVisible();
}
/** Save, and let the fixture's rebuild land; the manager must say so truthfully. */
async function saveAndUpdate(page: Page, request: import('@playwright/test').APIRequestContext) {
  await managerOf(page).locator('.pm-save').click();
  await expect(pmStatus(page)).toContainText('מעדכן את האתר…', { timeout: 30_000 });
  await expect(pmStatus(page)).not.toContainText('✓');
  await request.post('/__fixture/deploy');
  await expect(pmStatus(page)).toContainText('עודכן בתצוגת הבדיקה ✓', { timeout: 30_000 });
}
/** Click and hold with the mouse, then carry the photo. */
async function holdAndDrag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height * 0.6);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.6, { steps: 12 });
  await page.mouse.up();
}

for (const [locale, side] of [['he', 'left'], ['ar', 'left'], ['en', 'right']] as const) {
  test(`${locale}: the gallery Edit control ends the title row (${side}), and there is no end tile`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${locale}/about/`);
    const row = page.locator('section[data-gallery-kind="clinic"] .gallery-title-row');
    const edit = (await row.locator('> .visual-edit-control').boundingBox())!;
    const heading = (await row.locator('h2').boundingBox())!;
    const box = (await row.boundingBox())!;
    if (side === 'left') {
      expect(edit.x + edit.width).toBeLessThan(heading.x);
      expect(edit.x - box.x).toBeLessThan(2);
    } else {
      expect(edit.x).toBeGreaterThan(heading.x);
      expect(box.x + box.width - (edit.x + edit.width)).toBeLessThan(2);
    }
    expect(Math.abs(edit.y - heading.y)).toBeLessThan(80);
    await expect(page.locator('.visual-gallery-edit')).toHaveCount(0);
  });
}

test('the manager is photo-first: real thumbnails, and delete / edit on every photo as full touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openManager(page);
  const pm = managerOf(page);
  await expect(pm).toHaveAttribute('dir', 'rtl');
  await expect(pm.getByRole('heading', { name: 'תמונות המרפאה' })).toBeVisible();
  const first = tilesOf(page).first();
  await expect.poll(() => first.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  for (const control of [first.locator('.pm-edit'), first.locator('.pm-delete')]) {
    const b = (await control.boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  await expect(first.getByRole('button', { name: /^עריכת תמונה: / })).toBeVisible();
  await expect(first.getByRole('button', { name: /^מחיקת תמונה: / })).toBeVisible();
  // Desktop: a large sheet, not the whole screen; several photos per row.
  const sheet = (await pm.boundingBox())!;
  expect(sheet.width).toBeGreaterThan(1000);
  expect(sheet.width).toBeLessThan(1440);
  await expect(pm.locator('.pm-add')).toBeVisible();
});

test('photos: add several, see what is missing, describe and frame them, publish, save — and it persists', async ({ page, request }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openManager(page);
  const pm = managerOf(page);
  const tiles = tilesOf(page);
  const before = await tiles.count();
  const staged: string[] = [];
  page.on('request', (r) => { if (r.url().endsWith('/api/photos/stage')) staged.push(r.url()); });

  await pm.locator('#pm-add-input').setInputFiles([
    { name: 'room.png', mimeType: 'image/png', buffer: noisePng(1600, 1200, 7) },
    { name: 'desk.png', mimeType: 'image/png', buffer: noisePng(1600, 1200, 9) },
  ]);
  // Shown at once, as local previews.
  await expect(tiles).toHaveCount(before + 2);
  await expect(tiles.nth(before)).toContainText('חדשה');
  await expect(tiles.nth(before + 1).locator('img')).toHaveAttribute('src', /^blob:/);
  await expect(tiles.nth(before)).toContainText('חסר תיאור');

  // Without descriptions and the confirmation: refused, in words, nothing lost
  // — and nothing has left the browser.
  await pm.locator('.pm-save').click();
  await expect(pmStatus(page)).toContainText('יש לאשר');
  await page.waitForTimeout(300);
  expect(staged).toEqual([]);
  await pm.locator('#pm-confirm').check();
  await pm.locator('.pm-save').click();
  await expect(pm.locator('.pm-issues')).toContainText(`תמונה ${before + 1}: חסר תיאור בעברית.`);
  await expect(tiles).toHaveCount(before + 2);

  // Describe both; publish and frame the first.
  for (const [k, words] of [['חדר טיפולים', 'غرفة العلاج', 'Treatment room'], ['דלפק הקבלה', 'مكتب الاستقبال', 'Reception desk']].entries()) {
    await tiles.nth(before + k).locator('.pm-edit').click();
    const sheet = pm.locator('.pe');
    await expect(sheet.getByRole('heading', { name: 'עריכת תמונה' })).toBeVisible();
    for (const [j, lang] of (['he', 'ar', 'en'] as const).entries()) await sheet.locator(`textarea[data-alt="${lang}"]`).fill(words[j]);
    if (k === 0) {
      await sheet.getByLabel('מוצגת באתר').check();
      const crop = sheet.locator('.pe-crop');
      await crop.focus();
      for (let i = 0; i < 5; i += 1) await page.keyboard.press('+');
      await expect(sheet.getByRole('slider', { name: 'רמת הגדלה' })).toHaveValue('1.5');
      const c = (await crop.boundingBox())!;
      await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
      await page.mouse.down();
      await page.mouse.move(c.x + c.width / 2 + 60, c.y + c.height / 2 + 30, { steps: 6 });
      await page.mouse.up();
      await expect(sheet.locator('.pe-pos')).not.toContainText('50% · 50%');
      // The phone-size preview shows the same framing.
      const [big, small] = await Promise.all([crop.locator('img'), sheet.locator('.pe-small-frame img')].map((l) => l.evaluate((i) => i.getAttribute('style'))));
      expect(small).toBe(big);
    }
    await sheet.getByRole('button', { name: 'סיום' }).click();
    await expect(sheet).toHaveCount(0);
  }
  await expect(tiles.nth(before)).not.toContainText('חסר תיאור');
  await expect(tiles.nth(before)).not.toContainText('מוסתרת');
  await expect(tiles.nth(before + 1)).toContainText('מוסתרת');
  await expect(pm.locator('.pm-confirm')).toBeVisible();
  await pm.locator('#pm-confirm').check();
  await saveAndUpdate(page, request);

  const stored = ((await (await request.get('/api/photos')).json()) as { data: { records: Array<{ file: string; status: string; frame?: { x: number; y: number; zoom: number }; alt: { en: string } }> } }).data.records;
  const room = stored.find((r) => r.alt.en === 'Treatment room')!;
  expect(room.status).toBe('published');
  expect(room.frame?.zoom).toBe(1.5);
  expect(room.frame?.x).not.toBe(50);
  expect(stored.find((r) => r.alt.en === 'Reception desk')!.status).toBe('unpublished');

  await page.reload();
  await page.locator('.gallery-title-row .visual-edit-control').click();
  await expect(tiles).toHaveCount(before + 2);
  await expect(tiles.nth(before)).not.toContainText('חדשה');
  // The saved framing is what the tile shows.
  await expect(tiles.nth(before).locator('img')).toHaveAttribute('style', /scale\(1\.5\)/);
});

test('photos: replace one, reorder by click-and-hold, and keyboard Move — persisted after a reload', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openManager(page);
  const pm = managerOf(page);
  const tiles = tilesOf(page);

  // Replace the last photograph through its pen.
  const last = tiles.last();
  const srcBefore = await last.locator('img').getAttribute('src');
  await last.locator('.pm-edit').click();
  const sheet = pm.locator('.pe');
  const chooser = page.waitForEvent('filechooser');
  await sheet.getByRole('button', { name: 'החלפת התמונה' }).click();
  await (await chooser).setFiles({ name: 'room-2.png', mimeType: 'image/png', buffer: noisePng(1500, 1300, 11) });
  await expect(sheet.locator('.pe-crop img')).toHaveAttribute('src', /^blob:/, { timeout: 30_000 });
  await sheet.getByRole('button', { name: 'סיום' }).click();
  await expect(last).toContainText('הוחלפה');

  // Reorder with the mouse: click, hold, carry.
  const order = await filesOf(page);
  await holdAndDrag(page, tiles.nth(0), tiles.nth(1));
  const dragged = await filesOf(page);
  expect(dragged).toEqual([order[1], order[0], ...order.slice(2)]);
  await expect(pm.locator('.pm-ghost')).toHaveCount(0);

  // Escape while carrying puts it back.
  const a = (await tiles.nth(0).boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width * 1.6, a.y + a.height * 0.6, { steps: 8 });
  await expect(pm.locator('.pm-ghost')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(pm.locator('.pm-ghost')).toHaveCount(0);
  expect(await filesOf(page)).toEqual(dragged);
  await expect(pm).toBeVisible();

  // Keyboard: Move later appears on focus and keeps focus on the moved photo.
  const moveLater = tiles.nth(0).locator('.pm-keyboard button').last();
  await moveLater.focus();
  await expect(moveLater).toBeVisible();
  await page.keyboard.press('Enter');
  const keyed = await filesOf(page);
  expect(keyed).toEqual([dragged[1], dragged[0], ...dragged.slice(2)]);
  await expect(tiles.nth(1).locator('.pm-keyboard button').last()).toBeFocused();

  await pm.locator('#pm-confirm').check();
  await saveAndUpdate(page, request);
  const replaced = tiles.last();
  await expect(replaced).not.toContainText('הוחלפה');
  await expect.poll(() => replaced.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1500);
  expect(await replaced.locator('img').getAttribute('src')).not.toBe(srcBefore);

  await page.reload();
  await page.locator('.gallery-title-row .visual-edit-control').click();
  await expect(tiles.first()).toBeVisible();
  expect(await filesOf(page)).toEqual(keyed);
});

test('photos: a published photo is hidden first, never deleted in one step; then deleted', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openManager(page);
  const pm = managerOf(page);
  const tiles = tilesOf(page);
  const count = await tiles.count();
  const published = tiles.filter({ hasNotText: 'מוסתרת' }).first();
  const file = (await published.getAttribute('data-file'))!;

  const asked: string[] = [];
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => { asked.push(d.message()); void d.accept(); });
  await published.locator('.pm-delete').click();
  expect(asked.at(-1)).toContain('מוצגת כרגע באתר');
  const target = pm.locator(`.pm-tile[data-file="${file}"]`);
  await expect(target).toContainText('מוסתרת');
  await expect(tiles).toHaveCount(count);
  await saveAndUpdate(page, request);

  await target.locator('.pm-delete').click();
  expect(asked.at(-1)).toContain('למחוק את התמונה?');
  await expect(tiles).toHaveCount(count - 1);
  await saveAndUpdate(page, request);
  await page.reload();
  await page.locator('.gallery-title-row .visual-edit-control').click();
  await expect(tiles).toHaveCount(count - 1);
  await expect(pm.locator(`.pm-tile[data-file="${file}"]`)).toHaveCount(0);
});

test('a phone photo over the send limit is resized before upload, never enlarged', async ({ page, request }) => {
  test.setTimeout(90_000);
  await openManager(page);
  const pm = managerOf(page);
  // ~6.5 MB of incompressible pixels at 1800px: over the limit, under 2048.
  await pm.locator('#pm-add-input').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: noisePng(1800, 1200, 21) });
  const added = tilesOf(page).last();
  await expect(added).toContainText('חדשה');
  await added.locator('.pm-edit').click();
  const sheet = pm.locator('.pe');
  for (const [lang, text] of [['he', 'מסדרון'], ['ar', 'ممر'], ['en', 'Hallway']] as const) await sheet.locator(`textarea[data-alt="${lang}"]`).fill(text);
  await sheet.getByRole('button', { name: 'סיום' }).click();
  await pm.locator('#pm-confirm').check();
  const staged = page.waitForRequest((r) => r.url().endsWith('/api/photos/stage'));
  await pm.locator('.pm-save').click();
  const body = JSON.parse((await staged).postData() ?? '{}') as { contentBase64: string; confirmed: boolean };
  expect(body.confirmed).toBe(true);
  expect(Buffer.from(body.contentBase64, 'base64').length).toBeLessThanOrEqual(6 * 1024 * 1024);
  await expect(pmStatus(page)).toContainText('מעדכן את האתר…', { timeout: 30_000 });
  await request.post('/__fixture/deploy');
  await expect(pmStatus(page)).toContainText('עודכן בתצוגת הבדיקה ✓', { timeout: 30_000 });
  // Resized to 1600px on the long side — smaller, never enlarged.
  await expect.poll(() => tilesOf(page).last().locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1600);
});

test('an image that is too small is refused on its tile, with the reason', async ({ page }) => {
  await openManager(page);
  const pm = managerOf(page);
  await pm.locator('#pm-add-input').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: noisePng(400, 300) });
  await expect(tilesOf(page).last()).toContainText('קטנה מדי');
  await expect(pm.locator('.pm-save')).toBeDisabled();
});

/* ── The photo manager on a phone: long-press, drag, and scrolling ─────── */

test.describe('on a 390px touch phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('full screen, reachable Save, RTL, no sideways scrolling', async ({ page }) => {
    await openManager(page);
    const pm = managerOf(page);
    const box = (await pm.boundingBox())!;
    expect(box.x).toBe(0);
    expect(box.width).toBe(390);
    expect(box.height).toBe(844);
    const save = (await pm.locator('.pm-save').boundingBox())!;
    expect(save.y + save.height).toBeLessThanOrEqual(844);
    expect(save.height).toBeGreaterThanOrEqual(44);
    expect(await pm.evaluate((d) => d.scrollWidth <= d.clientWidth + 1)).toBe(true);
    expect(await pm.locator('.pm-body').evaluate((b) => b.scrollWidth <= b.clientWidth + 1)).toBe(true);
    const corner = (await tilesOf(page).first().locator('.pm-delete').boundingBox())!;
    expect(corner.width).toBeGreaterThanOrEqual(44);
    // Two photos per row, and the delete X sits on its own photo.
    const t0 = (await tilesOf(page).nth(0).boundingBox())!;
    const t1 = (await tilesOf(page).nth(1).boundingBox())!;
    expect(Math.abs(t0.y - t1.y)).toBeLessThan(2);
    expect(t1.x).toBeLessThan(t0.x); // RTL: the second photo is to the left
    expect(corner.x).toBeGreaterThanOrEqual(t0.x);
    expect(corner.x + corner.width).toBeLessThanOrEqual(t0.x + t0.width);
  });

  test('long-press lifts a photo and dragging rearranges; a quick swipe only scrolls', async ({ page }) => {
    await openManager(page);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const tiles = tilesOf(page);
    const order = await filesOf(page);
    const scrollBefore = await page.evaluate(() => window.scrollY);

    // A quick swipe: no long press, so no drag.
    const a = (await tiles.nth(0).boundingBox())!;
    await touch('touchStart', a.x + a.width / 2, a.y + a.height * 0.6);
    for (let i = 1; i <= 6; i += 1) await touch('touchMove', a.x + a.width / 2, a.y + a.height * 0.6 - i * 12);
    await touch('touchEnd');
    await expect(managerOf(page).locator('.pm-ghost')).toHaveCount(0);
    expect(await filesOf(page)).toEqual(order);

    // Long-press, then carry it onto its neighbour.
    const from = (await tiles.nth(0).boundingBox())!;
    const to = (await tiles.nth(1).boundingBox())!;
    const [x0, y0] = [from.x + from.width / 2, from.y + from.height * 0.6];
    await touch('touchStart', x0, y0);
    await page.waitForTimeout(650);
    await expect(managerOf(page).locator('.pm-ghost')).toHaveCount(1);
    const [x1, y1] = [to.x + to.width / 2, to.y + to.height * 0.6];
    for (let i = 1; i <= 10; i += 1) await touch('touchMove', x0 + ((x1 - x0) * i) / 10, y0 + ((y1 - y0) * i) / 10);
    await touch('touchEnd');
    await expect(managerOf(page).locator('.pm-ghost')).toHaveCount(0);
    expect(await filesOf(page)).toEqual([order[1], order[0], ...order.slice(2)]);
    // The page underneath never moved.
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    await expect(managerOf(page).locator('.pm-summary')).toContainText('1 שינויים שלא נשמרו');
  });

  test('the photo editor fills the phone and frames by touch', async ({ page }) => {
    await openManager(page);
    await tilesOf(page).first().locator('.pm-edit').click();
    const sheet = managerOf(page).locator('.pe');
    const box = (await sheet.boundingBox())!;
    expect(box.width).toBe(390);
    const done = (await sheet.getByRole('button', { name: 'סיום' }).boundingBox())!;
    expect(done.y).toBeGreaterThanOrEqual(0);
    expect(done.height).toBeGreaterThanOrEqual(44);
    expect(await sheet.locator('.pe-body').evaluate((b) => b.scrollWidth <= b.clientWidth + 1)).toBe(true);
    await sheet.getByRole('button', { name: 'ביטול' }).click();
    await expect(sheet).toHaveCount(0);
  });
});

for (const [locale, dir, words] of [
  ['ar', 'rtl', { title: 'صور العيادة', save: 'حفظ', add: 'إضافة صورة', edit: 'تعديل الصورة' }],
  ['en', 'ltr', { title: 'Clinic photos', save: 'Save', add: 'Add photo', edit: 'Edit photo' }],
] as const) {
  test(`the photo manager is in ${locale}, ${dir}`, async ({ page }) => {
    await openManager(page, locale);
    const pm = managerOf(page);
    await expect(pm).toHaveAttribute('dir', dir);
    await expect(pm).toHaveAttribute('lang', locale);
    await expect(pm.getByRole('heading', { name: words.title })).toBeVisible();
    await expect(pm.locator('.pm-save')).toHaveText(words.save);
    await expect(pm.locator('.pm-add')).toContainText(words.add);
    await tilesOf(page).first().locator('.pm-edit').click();
    await expect(pm.locator('.pe').getByRole('heading', { name: words.edit })).toBeVisible();
    const text = await pm.evaluate((d) => {
      const copy = d.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('textarea, input, .pe-form fieldset label').forEach((n) => n.remove());
      return copy.textContent ?? '';
    });
    expect(text).not.toMatch(/[֐-׿]{2,}/);
  });
}

/* ── Hours, contact, text ───────────────────────────────────────────────── */

test('hours: a mistake is explained in words and stays on screen; a fix saves', async ({ page }) => {
  await page.goto('/he/');
  await page.getByRole('button', { name: 'עריכת שעות הפעילות' }).first().click();
  const dialog = dialogOf(page);
  const monday = dialog.locator('[data-path="row_1"]');
  await monday.locator('input[type="time"]').first().fill('');
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(dialog.locator('.visual-errors')).toContainText('יום שני: יש למלא שעת פתיחה ושעת סגירה');
  await expect(dialog).not.toContainText('row_1');
  await monday.locator('input[type="time"]').first().fill('08:30');
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר (commit');
  await dialog.getByRole('button', { name: 'סגירה' }).click();
  await page.getByRole('button', { name: 'עריכת שעות הפעילות' }).first().click();
  await expect(dialog.locator('[data-path="row_1"] input[type="time"]').first()).toHaveValue('08:30');
});

test('text editors label fields in words, not data keys', async ({ page }) => {
  await page.goto('/he/');
  await page.getByRole('button', { name: 'עריכת הכותרת הראשית' }).click();
  const dialog = dialogOf(page);
  await expect(dialog.getByText('כותרת ראשית', { exact: true })).toBeVisible();
  await expect(dialog).not.toContainText('hero.title');
});

test('contact: a factual change needs the confirmation, and says so', async ({ page }) => {
  await page.goto('/he/');
  await page.getByRole('button', { name: 'עריכת פרטי ההתקשרות' }).first().click();
  const dialog = dialogOf(page);
  const postal = dialog.locator('[data-path="postalCode"]');
  const original = await postal.inputValue();
  await postal.fill(original === '2498000' ? '2498001' : '2498000');
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(dialog.locator('.visual-errors')).toContainText('יש לסמן את תיבת האישור');
  await dialog.locator('#visual-owner-confirm').check();
  await dialog.locator('#visual-same-location').check();
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר (commit');
});

/* ── Preview and phone ──────────────────────────────────────────────────── */

test('preview hides the gallery Edit control and card pencils, and brings them back', async ({ page }) => {
  await page.goto('/he/about/');
  const tile = page.locator('.gallery-title-row .visual-edit-control');
  await expect(tile).toBeVisible();
  await page.locator('.visual-editor-bar').getByRole('button', { name: 'תצוגת מטופל' }).click();
  await expect(tile).toBeHidden();
  await page.locator('.visual-editor-bar').getByRole('button', { name: 'חזרה לעריכה' }).click();
  await expect(tile).toBeVisible();
});

test('on a 390px phone the editor fills the screen and Save is always reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/he/');
  await page.getByRole('button', { name: `עריכה: ${heCard('veneers')}`, exact: true }).click();
  const dialog = dialogOf(page);
  const box = (await dialog.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(390);
  expect(box.height).toBeLessThanOrEqual(844);
  const save = dialog.getByRole('button', { name: 'שמירה', exact: true });
  const s = (await save.boundingBox())!;
  expect(s.y + s.height).toBeLessThanOrEqual(844);
  expect(s.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test('on a phone every card pencil sits on ITS card and is a full touch target', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/he/treatments/');
  const cards = page.locator('li:has(> .visual-card-edit)');
  const count = await cards.count();
  expect(count).toBeGreaterThan(1);
  for (let i = 0; i < count; i += 1) {
    const card = (await cards.nth(i).locator('> a').boundingBox())!;
    const pencil = (await cards.nth(i).locator('.visual-edit-control').boundingBox())!;
    expect(pencil.y).toBeGreaterThanOrEqual(card.y);
    expect(pencil.y + pencil.height).toBeLessThanOrEqual(card.y + card.height);
    expect(pencil.height).toBeGreaterThanOrEqual(44);
  }
});

/* ── The editor speaks the page's language ──────────────────────────────── */

for (const [locale, dir, words] of [
  ['ar', 'rtl', { bar: 'تعديل الموقع', treatments: 'العلاجات', save: 'حفظ', close: 'إغلاق', add: '+ إضافة علاج', preview: 'عرض المريض', status: 'وضع تجريبي' }],
  ['en', 'ltr', { bar: 'Editing the site', treatments: 'Treatments', save: 'Save', close: 'Close', add: '+ Add treatment', preview: 'Patient view', status: 'Test mode' }],
  ['he', 'rtl', { bar: 'עריכת האתר', treatments: 'טיפולים', save: 'שמירה', close: 'סגירה', add: '+ הוספת טיפול', preview: 'תצוגת מטופל', status: 'מצב בדיקה' }],
] as const) {
  test(`the editor interface is in ${locale}, ${dir}`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    const bar = page.locator('.visual-editor-bar');
    await expect(bar).toContainText(words.bar);
    await expect(bar.getByRole('button', { name: words.preview })).toBeVisible();
    await expect(bar.locator('.visual-bar-status')).toContainText(words.status);
    await bar.getByRole('button', { name: words.treatments, exact: true }).click();
    const dialog = dialogOf(page);
    await expect(dialog).toHaveAttribute('dir', dir);
    await expect(dialog).toHaveAttribute('lang', locale);
    await expect(dialog.getByRole('heading', { name: words.treatments, exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: words.save, exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: words.close, exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: words.add })).toBeVisible();
    // A treatment opens on the page's own language tab.
    await dialog.locator('.visual-sortable > .visual-item').first().getByRole('button').first().click();
    await expect(dialog.locator('[role="tab"][aria-selected="true"]')).toHaveText(
      { he: 'עברית', ar: 'العربية', en: 'English' }[locale],
    );
    // No Hebrew interface text on the Arabic or English page. Language tabs
    // name each language in its own script, which is correct.
    if (locale !== 'he') {
      const text = await dialog.evaluate((d) => {
        const copy = d.cloneNode(true) as HTMLElement;
        copy.querySelectorAll('[role="tab"], textarea, input').forEach((n) => n.remove());
        return copy.textContent ?? '';
      });
      expect(text).not.toMatch(/[\u0590-\u05ff]{2,}/);
    }
  });
}

test('an English validation error is in English', async ({ page }) => {
  await page.goto('/en/');
  await page.getByRole('button', { name: 'Edit opening hours' }).first().click();
  const dialog = dialogOf(page);
  await dialog.locator('[data-path="row_1"] input[type="time"]').first().fill('');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.locator('.visual-errors')).toContainText('Monday: enter opening and closing times');
  await expect(statusOf(page)).toContainText('Not saved');
});

/* ── Save → updating → updated → the page reloads itself ────────────────── */

test('after a save the editor waits for the rebuild, then reloads into it', async ({ page, request }) => {
  test.setTimeout(60_000);
  await page.goto('/he/');
  await page.getByRole('button', { name: 'עריכת הכותרת הראשית' }).click();
  const dialog = dialogOf(page);
  const eyebrow = dialog.locator('[data-path="hero.eyebrow.he"]');
  const original = await eyebrow.inputValue();
  await eyebrow.fill(`${original} ·`);
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר');
  await expect(dialog.locator('.visual-pub')).toContainText('מעדכן את תצוגת האתר');

  // The preview workflow finishes: the served build now contains the commit.
  await request.post('/__fixture/deploy');
  await page.waitForEvent('load', { timeout: 30_000 });
  await expect(page.locator('.visual-bar-status')).toContainText('הדף מציג את השינוי האחרון שנשמר');

  // Restore.
  await page.getByRole('button', { name: 'עריכת הכותרת הראשית' }).click();
  await dialog.locator('[data-path="hero.eyebrow.he"]').fill(original);
  await dialog.getByRole('button', { name: 'שמירה', exact: true }).click();
  await expect(statusOf(page)).toContainText('נשמר');
});
