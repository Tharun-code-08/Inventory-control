const CHUNK_RELOAD_KEY = 'ims-chunk-reload';

export function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    /Failed to fetch dynamically imported module/i.test(err.message) ||
    /Loading chunk \d+ failed/i.test(err.message) ||
    /Importing a module script failed/i.test(err.message)
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
