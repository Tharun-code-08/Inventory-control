import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installAuthRefreshStub, writeE2eSession } from './helpers';

const authDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth');
const authFile = path.join(authDir, 'admin.json');

setup('authenticate as admin', async ({ page }) => {
  await installAuthRefreshStub(page);
  await page.goto('/login');
  await page.locator('#email').fill(process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@retailims.com');
  await page.locator('#password').fill(process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'Admin@123');

  const cookieAcceptBtn = page.getByRole('button', { name: 'Accept all' });
  if ((await cookieAcceptBtn.count()) > 0 && (await cookieAcceptBtn.isVisible())) {
    await cookieAcceptBtn.click();
  }

  const loginResponsePromise = page.waitForResponse('**/api/v1/auth/login');

  await page.getByRole('button', { name: 'Continue to secure sign-in' }).click();

  const response = await loginResponsePromise;
  const json = await response.json();
  const authData = json.data as { accessToken: string; user: Record<string, unknown> };

  writeE2eSession({ accessToken: authData.accessToken, user: authData.user });

  await page.waitForURL(/\/(dashboard|products)/, { timeout: 30_000 });
  await expect(page.locator('header h2').first()).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: authFile });
});
