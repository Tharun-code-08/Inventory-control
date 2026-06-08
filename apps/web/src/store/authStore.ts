import { create } from 'zustand';

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

export const useAuthStore = create<AuthState>()((set) => ({
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
}));
