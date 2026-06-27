const CHUNK_RELOAD_KEY = 'ims-chunk-reload';

/**
 * Detect a stale-chunk / failed dynamic-import error across browsers.
 *
 * Detection is MESSAGE-based (not error.name) on purpose: AppErrorBoundary
 * reconstructs errors as `new Error(message)` (name "Error"), so a name check
 * would miss them.
 *
 * The trickiest case: after a deploy the old hashed chunk is gone, and nginx's
 * SPA fallback (`try_files ... /index.html`) returns index.html (HTML, 200) for
 * the `.js` request. The browser then parses HTML as a module and throws a
 * SyntaxError like "Unexpected token '<'" (Chrome) / "expected expression,
 * got '<'" (Firefox). Those must count as chunk errors too.
 */
export function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message || '';
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Loading CSS chunk [\w-]+ failed/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    // Stale hashed chunk served back as index.html (HTML parsed as JS module):
    /Unexpected token '?<'?/i.test(msg) ||
    /expected expression, got '<'/i.test(msg) ||
    /'<' is not a valid/i.test(msg)
  );
}

/** One automatic cache-busted reload per tab session after a deploy. */
export function reloadAppForStaleChunks(force = false): boolean {
  if (!force && sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    return false;
  }

  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  const url = new URL(window.location.href);
  url.searchParams.set('_cb', String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

export function clearChunkReloadFlag(): void {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}

/**
 * Re-arm the one-shot reload guard after the app has been running stably for a
 * while. This lets a *subsequent* deploy (in the same long-lived tab) recover
 * again, while still preventing a reload loop — a genuinely broken build never
 * stays up long enough to reach the timeout.
 */
export function armChunkReloadRecovery(stableMs = 5000): void {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    try {
      clearChunkReloadFlag();
    } catch {
      /* sessionStorage unavailable — ignore */
    }
  }, stableMs);
}
