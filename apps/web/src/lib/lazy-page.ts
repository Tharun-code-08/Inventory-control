import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkLoadError, reloadAppForStaleChunks } from '@/lib/chunk-reload';

/**
 * Lazy-load a page module with one automatic cache-busted reload on stale chunk errors (after deploy).
 */
// Pages accept varying props (e.g. `createOnly`); the lazy wrapper can't know
// each page's prop shape, so expose a permissive props record at the boundary.
type PageProps = Record<string, unknown>;

export function lazyPage<T extends Record<string, unknown>>(
  importer: () => Promise<T>,
  exportName: keyof T & string,
): LazyExoticComponent<ComponentType<PageProps>> {
  return lazy(async () => {
    try {
      const mod = await importer();
      const Comp = mod[exportName] as ComponentType<PageProps> | undefined;
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
