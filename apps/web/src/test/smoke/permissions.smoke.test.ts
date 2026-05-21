import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/permissions';

describe('permission smoke', () => {
  it('allows admin implicitly', () => {
    expect(
      hasPermission(
        {
          id: 'u1',
          email: 'a@test.com',
          name: 'A',
          role: 'ADMIN',
          shopId: null,
          permissions: [],
        },
        'purchase_order:create',
      ),
    ).toBe(true);
  });

  it('checks explicit permissions for non-admin users', () => {
    expect(
      hasPermission(
        {
          id: 'u2',
          email: 'u@test.com',
          name: 'U',
          role: 'SHOP_USER',
          shopId: 's1',
          permissions: ['shop:read'],
        },
        'shop:write',
      ),
    ).toBe(false);
  });
});

