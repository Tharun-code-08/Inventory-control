import type { INestApplication } from '@nestjs/common';

/**
 * Jest does not apply `moduleNameMapper` (e.g. the `@/` alias) when loading the
 * globalTeardown module, so importing the e2e bootstrap here — which pulls in
 * the full application module graph — fails to resolve aliased imports. The
 * shared app also lives in the test worker context rather than this one. Close
 * it best-effort from the global object without importing the app graph.
 */
export default async function globalTeardown() {
  const app = (globalThis as { __E2E_SHARED_APP__?: INestApplication })
    .__E2E_SHARED_APP__;
  if (app) {
    await app.close();
    (globalThis as { __E2E_SHARED_APP__?: INestApplication }).__E2E_SHARED_APP__ =
      undefined;
  }
}
