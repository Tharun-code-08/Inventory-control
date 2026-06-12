// Expo CLI falls back to the package.json "main" field when `expo start` is
// run from the monorepo root. The mobile app lives in apps/mobile — fail with
// a clear message instead of serving a broken AppEntry bundle to the device.
throw new Error(
  'Wrong directory: the mobile app lives in apps/mobile. ' +
    'From the repo root run "npm run dev:mobile", or run "npx expo start" inside apps/mobile.',
);
