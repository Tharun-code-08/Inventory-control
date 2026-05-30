import { RequestContextStore } from '../context/request-context';

/** Request metadata attached to critical audit rows when available. */
export function auditRequestMetadata() {
  const ctx = RequestContextStore.get();
  return {
    requestId: ctx?.requestId ?? null,
    ipAddress: ctx?.ipAddress ?? null,
    userAgent: ctx?.userAgent ?? null,
  };
}
