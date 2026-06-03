import { destroySharedE2eApp } from './helpers/e2e-bootstrap';

export default async function globalTeardown() {
  await destroySharedE2eApp();
}
