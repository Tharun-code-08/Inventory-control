import { GoogleDriveService } from './google-drive.service';

function buildConfig(map: Record<string, string | undefined>) {
  return {
    get: (key: string) => map[key],
    getOrThrow: (key: string) => {
      const v = map[key];
      if (!v) throw new Error(`missing ${key}`);
      return v;
    },
  } as any;
}

describe('GoogleDriveService config helpers', () => {
  it('reports missing keys when not configured', () => {
    const svc = new GoogleDriveService(buildConfig({}));
    expect(svc.isConfigured()).toBe(false);
    expect(svc.missingConfigKeys()).toEqual([
      'GOOGLE_OAUTH_CLIENT_ID',
      'GOOGLE_OAUTH_CLIENT_SECRET',
      'GOOGLE_OAUTH_REDIRECT_URI',
    ]);
  });

  it('is configured when all keys exist', () => {
    const svc = new GoogleDriveService(
      buildConfig({
        GOOGLE_OAUTH_CLIENT_ID: 'id',
        GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
        GOOGLE_OAUTH_REDIRECT_URI: 'https://example.com/callback',
      }),
    );
    expect(svc.missingConfigKeys()).toEqual([]);
    expect(svc.isConfigured()).toBe(true);
  });
});
