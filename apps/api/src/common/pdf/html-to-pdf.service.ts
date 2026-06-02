import { existsSync } from 'fs';
import * as puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;

function resolveExecutablePath(): string | undefined {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (configured && existsSync(configured)) return configured;

  try {
    const bundled = puppeteer.executablePath?.();
    if (bundled && existsSync(bundled)) return bundled;
  } catch {
    // Fall through to OS-specific candidates.
  }

  const candidates = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find((path) => existsSync(path));
}

async function launchBrowser(): Promise<Browser> {
  const executablePath = resolveExecutablePath();
  try {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
      ...(executablePath ? { executablePath } : {}),
    });
  } catch (err) {
    const message = (err as Error).message ?? 'Unknown error';
    const cause = err instanceof Error ? err : undefined;
    throw new Error(
      `PDF engine failed to start Chromium${executablePath ? ` (${executablePath})` : ''}: ${message}. ` +
        'Install Chromium/Chrome on the server or set PUPPETEER_EXECUTABLE_PATH.',
      { cause },
    );
  }
}

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const existing = await browserPromise;
      if (existing.connected) return existing;
    } catch {
      browserPromise = null;
    }
  }

  browserPromise = launchBrowser();
  const browser = await browserPromise;
  browser.on('disconnected', () => {
    browserPromise = null;
  });
  return browser;
}

export async function closePdfBrowser(): Promise<void> {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    // Ignore shutdown errors.
  } finally {
    browserPromise = null;
  }
}

export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 45_000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      timeout: 45_000,
    });
    const buffer = Buffer.from(pdf);
    if (buffer.length < 100 || buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
      throw new Error('PDF render produced an empty or invalid file');
    }
    return buffer;
  } catch (err) {
    const message = (err as Error).message ?? 'PDF render failed';
    const cause = err instanceof Error ? err : undefined;
    throw new Error(`Could not render PDF: ${message}`, { cause });
  } finally {
    await page.close().catch(() => undefined);
  }
}

process.once('beforeExit', () => {
  void closePdfBrowser();
});
