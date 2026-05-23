import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export type ProductCategoryConfig = {
  name: string;
  code: string;
  skuPrefix: string;
  description?: string;
  /** Default HSN for products in this category (4, 6, or 8 digits). */
  defaultHsnCode?: string;
};

const STORAGE_KEY_PREFIX = 'ims.productCategories';

function storageKeyForUser(userId: string | null | undefined, companyId: string | null | undefined) {
  const scope = companyId ?? userId ?? 'anonymous';
  return `${STORAGE_KEY_PREFIX}.${scope}`;
}

const DEFAULT_CATEGORIES: ProductCategoryConfig[] = [
  { name: 'Grocery', code: 'GROC', skuPrefix: 'GRC', description: 'Daily groceries', defaultHsnCode: '10063010' },
  { name: 'Household', code: 'HOUS', skuPrefix: 'HOU', description: 'Household items', defaultHsnCode: '34012000' },
  { name: 'Beverages', code: 'BEV', skuPrefix: 'BEV', description: 'Beverage products', defaultHsnCode: '22021000' },
  { name: 'Electronics', code: 'ELEC', skuPrefix: 'ELC', description: 'Electronic items', defaultHsnCode: '85171300' },
  { name: 'Others', code: 'OTHR', skuPrefix: 'OTH', description: 'Miscellaneous' },
];

function slugCategoryCode(name: string): string {
  const cleaned = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (cleaned.slice(0, 4) || 'CAT').padEnd(4, 'X');
}

function uniqueSkuPrefix(name: string, existing: ProductCategoryConfig[]): string {
  const letters = name.trim().toUpperCase().replace(/[^A-Z]/g, '');
  const base = (letters.slice(0, 3) || 'PRD').padEnd(3, 'X');
  const taken = new Set(existing.map((c) => c.skuPrefix.toUpperCase()));
  if (!taken.has(base)) return base;
  for (let i = 2; i <= 99; i += 1) {
    const candidate = `${base.slice(0, 2)}${i}`.slice(0, 3);
    if (!taken.has(candidate)) return candidate;
  }
  return `C${Date.now().toString().slice(-2)}`;
}

export function buildProductCategoryEntry(
  name: string,
  existing: ProductCategoryConfig[],
  description?: string,
  defaultHsnCode?: string,
): ProductCategoryConfig {
  const trimmed = name.trim();
  const hsn = defaultHsnCode?.trim();
  return {
    name: trimmed,
    code: slugCategoryCode(trimmed),
    skuPrefix: uniqueSkuPrefix(trimmed, existing),
    description: description?.trim() || undefined,
    defaultHsnCode: hsn && /^\d{4}(\d{2}){0,2}$/.test(hsn) ? hsn : undefined,
  };
}

export function useProductCategories() {
  const user = useAuthStore((s) => s.user);
  const storageKey = storageKeyForUser(user?.id, user?.companyId ?? null);
  const [categories, setCategories] = useState<ProductCategoryConfig[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setCategories(DEFAULT_CATEGORIES);
        return;
      }
      const parsed = JSON.parse(raw) as ProductCategoryConfig[];
      setCategories(Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES);
    } catch {
      setCategories(DEFAULT_CATEGORIES);
    }
  }, [storageKey]);

  const saveCategories = (next: ProductCategoryConfig[]) => {
    setCategories(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  const addCategory = (entry: ProductCategoryConfig) => {
    const next = [...categories, entry];
    saveCategories(next);
    return next;
  };

  return { categories, categoryNames, saveCategories, addCategory };
}

