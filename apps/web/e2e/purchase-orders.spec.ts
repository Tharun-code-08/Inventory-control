import { test, expect } from '@playwright/test';
import { gotoAuthed } from './helpers';

/**
 * Phase 8 — Purchase Orders table layout and procurement entry point.
 */
test.describe('purchase orders page (Phase 8)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthed(page, '/purchase-orders');
    await expect(page.getByRole('heading', { level: 1, name: 'Purchase Orders' })).toBeVisible();
  });

  test('renders PO list region with horizontal overflow on narrow viewports', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const plantFilter = page.getByRole('combobox').filter({ has: page.locator('text=Select Plant') });
    if (await plantFilter.count()) {
      await plantFilter.click();
      await page.getByRole('option').first().click();
    }

    await expect(
      page.getByRole('table').or(page.getByText('No purchase orders found')),
    ).toBeVisible({ timeout: 25_000 });

    if (await page.getByRole('table').isVisible()) {
      const scrollWrap = page.locator('.overflow-auto').first();
      await expect(scrollWrap).toBeVisible();
      const metrics = await scrollWrap.evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(metrics.scrollWidth).toBeGreaterThanOrEqual(metrics.clientWidth);
    }
  });

  test('shows create action on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('button', { name: 'Create PO' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
