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

  // Accept cookies if present to prevent any overlays from blocking the button
  const cookieAcceptBtn = page.getByRole('button', { name: 'Accept all' });
  if (await cookieAcceptBtn.count() > 0 && await cookieAcceptBtn.isVisible()) {
    await cookieAcceptBtn.click();
  }

  // Intercept the login response to capture token and user
  const loginResponsePromise = page.waitForResponse('**/api/v1/auth/login');

  await page.getByRole('button', { name: 'Continue to secure sign-in' }).click();

  const response = await loginResponsePromise;
  const json = await response.json();
  const authData = json.data;

  // Save to the legacy localStorage key so the helpers.ts refresh stub retrieves it on subsequent navigations
  await page.evaluate((data) => {
    localStorage.setItem('retail-ims-auth', JSON.stringify({
      state: {
        accessToken: data.accessToken,
        user: data.user
      }
    }));
  }, authData);

  await page.waitForURL(/\/(dashboard|products)/, { timeout: 30_000 });
  await expect(page.locator('header h2').first()).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: authFile });
});
