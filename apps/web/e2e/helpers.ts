import { expect, type Page } from '@playwright/test';

type PersistedAuth = {
  state?: { accessToken?: string; user?: Record<string, unknown> };
};

function readPersistedAuth(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('retail-ims-auth');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PersistedAuth;
    } catch {
      return null;
    }
  });
}

/**
 * The SPA bootstraps via POST /auth/refresh. In CI/local e2e the httpOnly cookie is
 * often missing from storageState, which would clear the session — stub a success.
 */
export async function installAuthRefreshStub(page: Page) {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    const persisted = await readPersistedAuth(page);
    const token = persisted?.state?.accessToken;
    const user = persisted?.state?.user;
    if (!token || !user) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { accessToken: token, user } }),
    });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    const persisted = await readPersistedAuth(page);
    const user = persisted?.state?.user;
    if (!user) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: user }),
    });
  });
}

/** Wait until zustand auth persisted and the app shell header is visible. */
export async function waitForAppShell(page: Page) {
  await expect(page.locator('header h2').first()).toBeVisible({ timeout: 30_000 });
}

export async function gotoAuthed(page: Page, path: string) {
  await installAuthRefreshStub(page);
  await page.goto(path);
  await waitForAppShell(page);
}
