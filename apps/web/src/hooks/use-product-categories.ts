import { useEffect, useMemo, useState } from 'react';

export type ProductCategoryConfig = {
  name: string;
  code: string;
  skuPrefix: string;
  description?: string;
};

const STORAGE_KEY = 'ims.productCategories';

const DEFAULT_CATEGORIES: ProductCategoryConfig[] = [
  { name: 'Grocery', code: 'GROC', skuPrefix: 'GRC', description: 'Daily groceries' },
  { name: 'Household', code: 'HOUS', skuPrefix: 'HOU', description: 'Household items' },
  { name: 'Beverages', code: 'BEV', skuPrefix: 'BEV', description: 'Beverage products' },
  { name: 'Electronics', code: 'ELEC', skuPrefix: 'ELC', description: 'Electronic items' },
  { name: 'Others', code: 'OTHR', skuPrefix: 'OTH', description: 'Miscellaneous' },
];

export function useProductCategories() {
  const [categories, setCategories] = useState<ProductCategoryConfig[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setCategories(DEFAULT_CATEGORIES);
        return;
      }
      const parsed = JSON.parse(raw) as ProductCategoryConfig[];
      setCategories(Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES);
    } catch {
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  const saveCategories = (next: ProductCategoryConfig[]) => {
    setCategories(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  return { categories, categoryNames, saveCategories };
}

