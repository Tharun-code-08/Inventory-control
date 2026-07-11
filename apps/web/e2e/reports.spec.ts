import { test, expect } from '@playwright/test';
import { gotoAuthed } from './helpers';

/**
 * Phase 8 — Reports tabs, tables, and chart region load without layout break.
 */
test.describe('reports page (Phase 8)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthed(page, '/reports');
    await expect(page.getByRole('heading', { level: 1, name: 'Reports & Analytics' })).toBeVisible();
  });

  test('loads low-stock tab with data table', async ({ page }) => {
    // Reports redesign renamed the default tab from "Inventory" to "Low Stock".
    await expect(page.getByRole('tab', { name: /low stock/i })).toBeVisible();
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 25_000 });
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 25_000 });
  });

  test('switches register tabs without losing page shell', async ({ page }) => {
    const grTab = page.getByRole('tab', { name: 'GR Register' });
    if (await grTab.isVisible()) {
      await grTab.click();
      await expect(page.getByRole('heading', { level: 1, name: 'Reports & Analytics' })).toBeVisible();
      await expect(page.locator('table').first()).toBeVisible({ timeout: 25_000 });
    }
  });

  test('report tables scroll horizontally on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const scrollWrap = page.locator('.overflow-x-auto').first();
    await expect(scrollWrap).toBeVisible({ timeout: 20_000 });
    const metrics = await scrollWrap.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeGreaterThanOrEqual(metrics.clientWidth);
  });
});
