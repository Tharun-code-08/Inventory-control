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
  permissions: string[];
  shop?: AuthShop | null;
  avatarUrl?: string | null;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  initialized: boolean;
  setSession: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  setInitialized: (initialized: boolean) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  initialized: false,
  setSession: (accessToken, refreshToken, user) =>
    set({ accessToken, refreshToken, user, initialized: true }),
  setInitialized: (initialized) => set({ initialized }),
  clear: () => set({ accessToken: null, refreshToken: null, user: null, initialized: true }),
}));
