import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkLoadError, reloadAppForStaleChunks } from '@/lib/chunk-reload';

/**
 * Lazy-load a page module with one automatic cache-busted reload on stale chunk errors (after deploy).
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
      if (isChunkLoadError(err) && reloadAppForStaleChunks()) {
        await new Promise<void>(() => {});
      }
      throw err;
    }
  });
}
