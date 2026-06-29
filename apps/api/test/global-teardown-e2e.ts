/**
 * Jest runs globalTeardown in the main process, while the shared Nest app is
 * created and stored on `global` inside the test *worker* — so it is not
 * reachable here, and importing the bootstrap (which pulls in AppModule and its
 * `@/`-aliased providers) would fail because jest's moduleNameMapper does not
 * apply to globalSetup/globalTeardown modules.
 *
 * The e2e config sets `forceExit: true`, so jest tears the worker process down
 * (closing its Redis/BullMQ handles) once the suites finish — there is nothing
 * for this main-process hook to do.
 */
export default async function globalTeardown(): Promise<void> {
  // intentionally empty — see file header
}
