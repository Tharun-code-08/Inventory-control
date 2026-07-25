import { AsyncLocalStorage } from 'async_hooks';

interface TenantCtx {
  companyId: string | null;
  inRLSTx: boolean;
}

const storage = new AsyncLocalStorage<TenantCtx>();

export const TenantContext = {
  get: (): TenantCtx | undefined => storage.getStore(),
  run: <T>(ctx: TenantCtx, fn: () => T): T => storage.run(ctx, fn),
};
