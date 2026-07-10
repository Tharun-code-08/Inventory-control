// Analytics seam for navigation events.
// Today: console.debug only. Later: emit telemetry (most-used modules, Favorites candidates).
export function trackNavOpen(path: string) {
  if (import.meta.env.DEV) {
    console.debug('[nav]', path);
  }
}
