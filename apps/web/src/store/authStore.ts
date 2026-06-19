import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';

const STORAGE_KEY = 'retail-ims-auth-state';

const storage: PersistStorage<any> = {
  getItem: (name: string) => {
    const item = typeof window !== 'undefined' ? window.localStorage.getItem(name) : null;
    return item ? JSON.parse(item) : null;
  },
  setItem: (name: string, value: any) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(name, JSON.stringify(value));
    }
  },
  removeItem: (name: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(name);
    }
  },
};

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
  isPlatformAdmin?: boolean;
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
      name: STORAGE_KEY,
      storage,
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
);
