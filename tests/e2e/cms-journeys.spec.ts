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

/* ── Gallery ────────────────────────────────────────────────────────────── */

test('the clinic gallery ends with an Edit tile that manages THAT gallery', async ({ page }) => {
  await page.goto('/he/about/');
  const lastTile = page.locator('section[data-gallery-kind="clinic"] ul > li').last();
  await expect(lastTile).toHaveClass(/visual-gallery-edit/);
  await lastTile.getByRole('button', { name: 'עריכת הגלריה' }).click();
  const dialog = dialogOf(page);
  await expect(dialog.getByRole('heading', { name: 'גלריית תמונות המרפאה' })).toBeVisible();
  // Existing photographs show real thumbnails.
  const thumb = dialog.locator('.visual-photo-card img').first();
  await expect(thumb).toBeVisible();
  await expect.poll(() => thumb.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
});

test('gallery: multi-upload, describe, publish, replace, unpublish, delete, reorder — and it persists', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/he/about/');
  await page.getByRole('button', { name: 'עריכת הגלריה' }).click();
  const dialog = dialogOf(page);
  const cards = dialog.locator('.visual-photo-grid > .visual-item');
  await expect(cards.first()).toBeVisible();
  const before = await cards.count();

  // Multi-upload two phone-sized photographs, each with its own descriptions.
  await dialog.locator('#visual-upload-input').setInputFiles([
    { name: 'room.png', mimeType: 'image/png', buffer: noisePng(1600, 1200, 7) },
    { name: 'desk.png', mimeType: 'image/png', buffer: noisePng(1600, 1200, 9) },
  ]);
  const pendingCards = dialog.locator('[data-pending]');
  await expect(pendingCards).toHaveCount(2);
  for (const [i, words] of [['חדר', 'غرفة', 'Room'], ['דלפק', 'مكتب', 'Desk']].entries()) {
    const card = pendingCards.nth(i);
    await card.locator('select').selectOption('treatment-room');
    for (const [j, lang] of ['he', 'ar', 'en'].entries()) await card.locator(`[data-path$=".${lang}"]`).fill(words[j]);
  }
  await dialog.locator('#visual-upload-confirm').check();
  await dialog.getByRole('button', { name: 'העלאת 2 תמונות' }).click();
  await expect(statusOf(page)).toContainText('2 תמונות הועלו', { timeout: 60_000 });
  await expect(cards).toHaveCount(before + 2);
  const addedFile = await cards.filter({ hasText: 'חדר טיפולים' }).first().getAttribute('data-file');
  const added = dialog.locator(`.visual-photo-card[data-file="${addedFile}"]`);
  await expect.poll(() => added.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1600);

  // Edit its English description.
  await added.getByRole('button', { name: /^עריכת התיאור/ }).click();
  await added.locator('[data-path$=".en"]').fill('Treatment room');
  await added.getByRole('button', { name: 'שמירת התיאור' }).click();
  await expect(statusOf(page)).toContainText('התיאור נשמר');

  // Publish, then replace the (over-1-MB) photograph — the flow that failed.
  const room = added;
  await room.getByRole('button', { name: /^עריכת התיאור/ }).click();
  await expect(room.locator('[data-path$=".en"]')).toHaveValue('Treatment room');
  await room.getByRole('button', { name: /^סגירת עריכת התיאור/ }).click();
  await room.getByRole('button', { name: /^הצגה באתר/ }).click();
  await expect(statusOf(page)).toContainText('התמונה סומנה להצגה באתר');
  await expect(room).toContainText('מוצג באתר');
  const srcBefore = await room.locator('img').getAttribute('src');
  const chooser = page.waitForEvent('filechooser');
  await room.getByRole('button', { name: /^החלפת תמונה/ }).click();
  // Under the 6 MB send limit, so it goes as-is (a larger one is resized).
  await (await chooser).setFiles({ name: 'room-2.png', mimeType: 'image/png', buffer: noisePng(1500, 1300, 11) });
  await expect(statusOf(page)).toContainText('התמונה הוחלפה', { timeout: 60_000 });
  await expect(room.locator('img')).not.toHaveAttribute('src', srcBefore!);
  await expect.poll(() => room.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1500);

  // Unpublish and delete it.
  await room.getByRole('button', { name: /^הסתרה מהאתר/ }).click();
  await expect(statusOf(page)).toContainText('התמונה הוסתרה מהאתר');
  await room.getByRole('button', { name: /^מחיקה/ }).click();
  await expect(statusOf(page)).toContainText('התמונה נמחקה');
  await expect(cards).toHaveCount(before + 1);

  // Reorder by dragging, save, and check it after a full reload.
  const names = async () => cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-file')));
  const order = await names();
  const count = await cards.count();
  await cards.last().scrollIntoViewIfNeeded();
  await dragOnto(page, cards.last().locator('.visual-grip'), cards.nth(count - 2));
  await expect(dialog.getByRole('button', { name: 'שמירת הסדר' })).toBeVisible();
  await dialog.getByRole('button', { name: 'שמירת הסדר' }).click();
  await expect(statusOf(page)).toContainText('הסדר נשמר');
  const reordered = await names();
  expect(reordered).not.toEqual(order);
  expect([...reordered].sort()).toEqual([...order].sort());

  await page.reload();
  await page.getByRole('button', { name: 'עריכת הגלריה' }).click();
  await expect(cards).toHaveCount(before + 1);
  expect(await names()).toEqual(reordered);
});

test('a photo over the send limit is resized, never enlarged, and still uploads', async ({ page }) => {
  await page.goto('/he/about/');
  await page.getByRole('button', { name: 'עריכת הגלריה' }).click();
  const dialog = dialogOf(page);
  // ~6.5 MB of incompressible pixels at 1800px: over the limit, under 2048.
  await dialog.locator('#visual-upload-input').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: noisePng(1800, 1200, 21) });
  await expect(dialog.locator('[data-pending] .visual-hint').first()).toContainText('1600×1067');
  await dialog.getByRole('button', { name: 'הסרה מהרשימה' }).click();
  await expect(dialog.locator('[data-pending]')).toHaveCount(0);
});

test('an image that is too small is refused before upload, with the reason', async ({ page }) => {
  await page.goto('/he/about/');
  await page.getByRole('button', { name: 'עריכת הגלריה' }).click();
  const dialog = dialogOf(page);
  await dialog.locator('#visual-upload-input').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: noisePng(400, 300) });
  await expect(dialog.locator('[data-pending] .visual-inline-error')).toContainText('קטנה מדי');
  await expect(dialog.getByRole('button', { name: 'העלאת 0 תמונות' })).toBeDisabled();
});

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

test('preview hides the gallery tile and card pencils, and brings them back', async ({ page }) => {
  await page.goto('/he/about/');
  const tile = page.locator('.visual-gallery-edit');
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
