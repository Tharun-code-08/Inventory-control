import { test, expect } from '@playwright/test';
import { gotoAuthed } from './helpers';

/**
 * Phase 8 — Mobile: sidebar scroll, section headings, navigation targets.
 */
test.describe('mobile sidebar (Phase 8)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await gotoAuthed(page, '/dashboard');
    await expect(page.locator('header h2')).toHaveText('Dashboard');
  });

  test('opens overlay nav with ERP sections and routes to Purchase Orders', async ({ page }) => {
    await page.getByRole('button', { name: 'Open navigation' }).click();

    const sidebar = page.locator('aside.sidebar');
    await expect(sidebar).toBeVisible();
    for (const section of ['Master Data', 'Procurement', 'Sales & Finance', 'Operations']) {
      await expect(sidebar.getByText(section, { exact: true }).first()).toBeVisible();
    }

    await sidebar.getByRole('button', { name: 'Purchase Orders' }).click();
    await expect(page).toHaveURL(/\/purchase-orders/);
    await expect(page.locator('header h2')).toHaveText('Purchase Orders');

    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  });

  test('sidebar scrolls when many items are listed', async ({ page }) => {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const nav = page.locator('nav.sidebar-scroll');
    await expect(nav).toBeVisible();

    const metrics = await nav.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(metrics.scrollHeight).toBeGreaterThanOrEqual(metrics.clientHeight);
  });
});
