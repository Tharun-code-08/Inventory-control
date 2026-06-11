// src/store/stockCountStore.ts
import create from 'zustand';
import { CountLineItem } from '@/src/api/stockCount';

interface StockCountState {
  sessionId: string | null;
  items: Record<string, CountLineItem>; // key = barcode
  setSessionId: (id: string | null) => void;
  addItem: (item: CountLineItem) => void;
  reset: () => void;
}

export const useStockCountStore = create<StockCountState>((set) => ({
  sessionId: null,
  items: {},
  setSessionId: (id) => set({ sessionId: id }),
  addItem: (item) =>
    set((state) => ({
      items: { ...state.items, [item.barcode]: item },
    })),
  reset: () => set({ sessionId: null, items: {} }),
}));
