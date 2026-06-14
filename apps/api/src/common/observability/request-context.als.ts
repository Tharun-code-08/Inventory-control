import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request context propagated via AsyncLocalStorage so that cross-cutting
 * concerns (most notably audit logging) can capture the request id without it
 * having to be threaded explicitly through every service call.
 */
export interface RequestContextStore {
  requestId?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

/** Returns the current request id, if a request context is active. */
export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}
