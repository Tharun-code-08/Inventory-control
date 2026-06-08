import {
  isPlatformAdminEmail,
  parsePlatformAdminEmails,
} from './platform-admin.util';

describe('platform-admin.util', () => {
  it('parses comma-separated emails case-insensitively', () => {
    const set = parsePlatformAdminEmails('Admin@Example.com, ops@test.io');
    expect(set.has('admin@example.com')).toBe(true);
    expect(set.has('ops@test.io')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('returns false for empty allowlist', () => {
    expect(isPlatformAdminEmail('admin@example.com', new Set())).toBe(false);
  });

  it('matches email case-insensitively', () => {
    const set = parsePlatformAdminEmails('admin@example.com');
    expect(isPlatformAdminEmail('Admin@Example.com', set)).toBe(true);
    expect(isPlatformAdminEmail('other@example.com', set)).toBe(false);
  });
});
