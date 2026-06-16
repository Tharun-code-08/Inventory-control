export interface BaseDocument {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  updatedById?: string | null;
}

export interface BaseDocumentItem {
  id: string;
  productId: string;
  quantity: number;
  uom: string;
  product: { productCode: string; description: string };
}

export interface CursorPageMeta {
  nextCursor: string | null;
  limit: number;
  hasMore: boolean;
}

export interface CursorPage<T> {
  items: T[];
  meta: CursorPageMeta;
}

export interface OffsetPageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OffsetPage<T> {
  items: T[];
  meta: OffsetPageMeta;
}
