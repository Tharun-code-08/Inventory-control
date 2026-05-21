import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installAuthRefreshStub } from './helpers';

const authFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth', 'admin.json');

setup('authenticate as admin', async ({ page }) => {
  await installAuthRefreshStub(page);
  await page.goto('/login');
  await page.locator('#email').fill(process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@retailims.com');
  await page.locator('#password').fill(process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'Admin@123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/(dashboard|products)/, { timeout: 30_000 });
  await expect(page.locator('header h2').first()).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: authFile });
});
