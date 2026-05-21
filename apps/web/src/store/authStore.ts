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
  permissions: string[];
  shop?: AuthShop | null;
  avatarUrl?: string | null;
};

export type SessionProductPlant = {
  shopId: string;
  storageLocationId?: string | null;
  openingStock: number;
  minStockLevel: number;
  maxStockLevel?: number | null;
  reorderQty?: number | null;
  isActive: boolean;
};

export type SessionProductSpec = {
  id?: string;
  label: string;
  value: string;
};

export type SessionProduct = {
  id: string;
  productCode: string;
  description: string;
  uom: string;
  category: string;
  materialGroup?: string | null;
  drawingReference?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  isActive: boolean;
  plants: SessionProductPlant[];
  specifications: SessionProductSpec[];
  stockByShop?: Record<string, number>;
  totalStock?: number;
  currentStock?: number;
  createdAt: string;
  updatedAt: string;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  products: SessionProduct[];
  initialized: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  setInitialized: (initialized: boolean) => void;
  setUser: (user: AuthUser) => void;
  setProducts: (products: SessionProduct[]) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      products: [],
      initialized: false,
      setSession: (accessToken, user) =>
        set((state) => ({
          accessToken,
          user,
          products: state.user?.id === user.id ? state.products : [],
          initialized: true,
        })),
      setInitialized: (initialized) => set({ initialized }),
      setUser: (user) => set((state) => ({ ...state, user })),
      setProducts: (products) => set((state) => ({ ...state, products })),
      clear: () => set({ accessToken: null, user: null, products: [], initialized: true }),
    }),
    {
      name: 'retail-ims-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        products: state.products,
      }),
    },
  ),
);
