import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    /Failed to fetch dynamically imported module/i.test(err.message) ||
    /Loading chunk \d+ failed/i.test(err.message) ||
    /Importing a module script failed/i.test(err.message)
  );
}

/**
 * Lazy-load a page module with one automatic full reload on stale chunk errors (after deploy).
 */
export function lazyPage<T extends Record<string, ComponentType<unknown>>>(
  importer: () => Promise<T>,
  exportName: keyof T & string,
): LazyExoticComponent<ComponentType<unknown>> {
  return lazy(async () => {
    try {
      const mod = await importer();
      const Comp = mod[exportName];
      if (!Comp) {
        throw new Error(`Page export "${exportName}" was not found`);
      }
      return { default: Comp };
    } catch (err) {
      if (isChunkLoadError(err) && !sessionStorage.getItem('ims-chunk-reload')) {
        sessionStorage.setItem('ims-chunk-reload', '1');
        window.location.reload();
        await new Promise<void>(() => {});
      }
      sessionStorage.removeItem('ims-chunk-reload');
      throw err;
    }
  });
}
