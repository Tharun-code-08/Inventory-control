import { describe, expect, it } from 'vitest';
import { backupDownloadUrl } from './use-backups';

describe('backupDownloadUrl', () => {
  it('builds the download path for an artifact', () => {
    expect(backupDownloadUrl('abc123')).toBe('/backups/artifacts/abc123/download');
  });
});
