import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthShop = {
  id: string;
  shopNumber: string;
  shopName: string;
  address: string;
  contactPerson: string;
  mobile: string;
  email: string;
  isActive: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  shopId: string | null;
  companyId?: string | null;
  permissions: string[];
  shop?: AuthShop | null;
  avatarUrl?: string | null;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  initialized: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  setInitialized: (initialized: boolean) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
};

type PersistedAuth = Pick<AuthState, 'accessToken' | 'user'>;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      initialized: false,
      setSession: (accessToken, user) =>
        set({
          accessToken,
          user,
          initialized: true,
        }),
      setInitialized: (initialized) => set({ initialized }),
      setUser: (user) => set((state) => ({ ...state, user })),
      clear: () => set({ accessToken: null, user: null, initialized: true }),
    }),
    {
      name: 'retail-ims-auth',
      version: 2,
      partialize: (state): PersistedAuth => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
      migrate: (persisted) => {
        const state = persisted as PersistedAuth & { products?: unknown };
        if (state && 'products' in state) {
          const { products: _removed, ...rest } = state;
          return rest;
        }
        return persisted as PersistedAuth;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setInitialized(true);
        }
      },
    },
  ),
);
