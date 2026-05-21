import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/authStore';

describe('Auth session smoke', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      user: null,
      products: [],
      initialized: false,
    });
  });

  it('keeps initialized true after login session set', () => {
    useAuthStore.getState().setSession('token-a', {
      id: 'u1',
      email: 'u1@test.com',
      name: 'User One',
      role: 'ADMIN',
      shopId: null,
      permissions: [],
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token-a');
    expect(state.user?.id).toBe('u1');
    expect(state.initialized).toBe(true);
  });

  it('does not regress initialized during clear', () => {
    useAuthStore.getState().setInitialized(true);
    useAuthStore.getState().clear();
    const state = useAuthStore.getState();
    expect(state.initialized).toBe(true);
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });
});
