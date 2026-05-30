import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request context propagated via Node's AsyncLocalStorage. Anything stored
 * here is available across async boundaries within the same HTTP request without
 * threading it through every function call.
 */
export type RequestContext = {
  requestId: string;
  /** W3C trace parent header (https://www.w3.org/TR/trace-context/) when present. */
  traceparent?: string | null;
  userId?: string | null;
  shopId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export const RequestContextStore = {
  run<T>(context: RequestContext, fn: () => T): T {
    return storage.run(context, fn);
  },
  get(): RequestContext | undefined {
    return storage.getStore();
  },
  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
  /** Mutate the context for the current request (e.g. once auth resolves the user). */
  patch(patch: Partial<RequestContext>): void {
    const current = storage.getStore();
    if (!current) return;
    Object.assign(current, patch);
  },
};
