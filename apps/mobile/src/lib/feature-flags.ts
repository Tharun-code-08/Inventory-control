export const features = {
  mobilePurchaseOrders: true,
  mobileGoodsReceipts: true,
  mobileSalesOrders: true,
  mobileInvoices: true,
  mobileSuppliers: true,
  mobileCustomers: true,
  mobileReports: true,
  mobileBarcodePrint: true,
  // Disabled until the stock-count API module exists on the backend.
  mobileStockCount: false,
  mobilePdfExport: true,
  mobileGlobalSearch: true,
  mobileOfflineCache: true,
} as const;
