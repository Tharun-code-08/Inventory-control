export const features = {
  mobilePurchaseOrders: true,
  mobileGoodsReceipts: true,
  mobileSalesOrders: true,
  // Hidden from mobile navigation per module restructuring — routes, APIs,
  // permissions, and relations all stay intact (used by PO/RFQ/quotations).
  mobileInvoices: false,
  mobileSuppliers: false,
  mobileCustomers: false,
  mobileReports: true,
  mobileWarehouses: true,
  mobileBarcodePrint: true,
  // Disabled until the stock-count API module exists on the backend.
  mobileStockCount: false,
  mobilePdfExport: true,
  mobileGlobalSearch: true,
  mobileOfflineCache: true,
} as const;
