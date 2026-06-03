import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const sessionFile = path.join(e2eDir, '.auth', 'session.json');

export type E2eSession = {
  accessToken: string;
  user: Record<string, unknown>;
};

export function writeE2eSession(session: E2eSession) {
  fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
  fs.writeFileSync(sessionFile, JSON.stringify(session), 'utf8');
}

function readE2eSession(): E2eSession | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(sessionFile, 'utf8')) as E2eSession;
    if (parsed?.accessToken && parsed?.user) return parsed;
  } catch {
    // setup has not run yet
  }
  return null;
}

function authEnvelope(session: E2eSession) {
  return JSON.stringify({ success: true, data: { accessToken: session.accessToken, user: session.user } });
}

/**
 * The SPA bootstraps via POST /auth/refresh. main.tsx clears legacy localStorage, so
 * e2e uses session.json from auth.setup plus optional cookie-based refresh via preview proxy.
 */
export async function installAuthRefreshStub(page: Page) {
  const session = readE2eSession();

  await page.route('**/api/v1/auth/refresh', async (route) => {
    if (!session) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: authEnvelope(session),
    });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    if (!session) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: session.user }),
    });
  });
}

/** Wait until auth bootstrap finished and the app shell top bar is visible. */
export async function waitForAppShell(page: Page) {
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });
  await expect(page.locator('header h2').first()).toBeVisible({ timeout: 30_000 });
}

export async function gotoAuthed(page: Page, path: string) {
  await installAuthRefreshStub(page);
  const refreshDone = page.waitForResponse(
    (res) => res.url().includes('/api/v1/auth/refresh') && res.status() >= 200 && res.status() < 300,
    { timeout: 30_000 },
  );
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await refreshDone;
  await waitForAppShell(page);
}
