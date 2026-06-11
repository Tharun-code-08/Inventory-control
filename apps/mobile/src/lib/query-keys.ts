export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export const giKeys = {
  all: ['goods-issues'] as const,
  lists: () => [...giKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...giKeys.lists(), filters] as const,
  details: () => [...giKeys.all, 'detail'] as const,
  detail: (id: string) => [...giKeys.details(), id] as const,
};

export const alertKeys = {
  all: ['alerts'] as const,
  list: () => [...alertKeys.all, 'list'] as const,
};

export const poKeys = {
  all: ['purchase-orders'] as const,
  lists: () => [...poKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...poKeys.lists(), filters] as const,
  details: () => [...poKeys.all, 'detail'] as const,
  detail: (id: string) => [...poKeys.details(), id] as const,
};

export const grKeys = {
  all: ['goods-receipts'] as const,
  lists: () => [...grKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...grKeys.lists(), filters] as const,
  details: () => [...grKeys.all, 'detail'] as const,
  detail: (id: string) => [...grKeys.details(), id] as const,
};

export const soKeys = {
  all: ['sales-orders'] as const,
  lists: () => [...soKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...soKeys.lists(), filters] as const,
  details: () => [...soKeys.all, 'detail'] as const,
  detail: (id: string) => [...soKeys.details(), id] as const,
};

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...supplierKeys.lists(), filters] as const,
  details: () => [...supplierKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
};

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

export const reportKeys = {
  all: ['reports'] as const,
  inventory: (filters?: Record<string, unknown>) => [...reportKeys.all, 'inventory', filters] as const,
  lowStock: (filters?: Record<string, unknown>) => [...reportKeys.all, 'low-stock', filters] as const,
  fastMoving: (filters?: Record<string, unknown>) => [...reportKeys.all, 'fast-moving', filters] as const,
  shopSummary: (filters?: Record<string, unknown>) => [...reportKeys.all, 'shop-summary', filters] as const,
  overview: (filters?: Record<string, unknown>) => [...reportKeys.all, 'overview', filters] as const,
};

export const shopKeys = {
  all: ['shops'] as const,
  list: () => [...shopKeys.all, 'list'] as const,
};
