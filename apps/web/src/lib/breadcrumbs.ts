export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbLabelMap = {
  rfqNumber?: string;
  salesOrderNumber?: string;
};

export type BreadcrumbContext = {
  homeHref: string;
  params: Record<string, string | undefined>;
  searchParams: URLSearchParams;
  labels: BreadcrumbLabelMap;
};

export type BreadcrumbRoute = {
  path: string;
  buildItems: (ctx: BreadcrumbContext) => BreadcrumbItem[];
  subtitle?: (ctx: BreadcrumbContext) => string | undefined;
};

const reportTabMeta: Record<string, { label: string; subtitle: string }> = {
  'executive-summary': {
    label: 'Executive Summary',
    subtitle: 'Executive KPIs, alerts, and rankings for leadership review.',
  },
  'purchase-orders': {
    label: 'Purchase Orders',
    subtitle: 'Track procurement totals, status, and supplier performance.',
  },
  'sales-orders': {
    label: 'Sales Orders',
    subtitle: 'Monitor sales order volume, value, and customer activity.',
  },
  'low-stock': {
    label: 'Low Stock',
    subtitle: 'Identify items below the minimum stock threshold.',
  },
  'stock-ledger': {
    label: 'Stock Ledger',
    subtitle: 'Review stock movements and balances by product.',
  },
  'gr-register': {
    label: 'GR Register',
    subtitle: 'Audit goods receipt transactions and quantities.',
  },
  'gi-register': {
    label: 'GI Register',
    subtitle: 'Audit goods issue transactions and dispatches.',
  },
  'shop-summary': {
    label: 'Shop Summary',
    subtitle: 'Compare stock, receipts, and sales across plants.',
  },
  'inventory-aging': {
    label: 'Inventory Aging',
    subtitle: 'Understand how long stock has been idle by bucket.',
  },
  'rfq-analytics': {
    label: 'RFQ Analytics',
    subtitle: 'Track RFQ volume, conversion, and cycle time.',
  },
};

const homeItem = (ctx: BreadcrumbContext): BreadcrumbItem => ({
  label: 'Home',
  href: ctx.homeHref,
});

const inventoryItem = (): BreadcrumbItem => ({ label: 'Inventory', href: '/products' });
const procurementItem = (): BreadcrumbItem => ({ label: 'Procurement', href: '/rfqs' });
const salesItem = (): BreadcrumbItem => ({ label: 'Sales', href: '/sales' });
const reportsItem = (): BreadcrumbItem => ({ label: 'Reports', href: '/reports' });
const settingsItem = (): BreadcrumbItem => ({ label: 'Settings', href: '/settings' });

export const breadcrumbRoutes: BreadcrumbRoute[] = [
  {
    path: '/',
    buildItems: (ctx) => [homeItem(ctx)],
    subtitle: () => 'Welcome to your workspace overview.',
  },
  {
    path: '/dashboard',
    buildItems: (ctx) => [homeItem(ctx)],
    subtitle: () => 'Organisation KPIs and operational alerts.',
  },
  {
    path: '/products/new',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Products', href: '/products' }, { label: 'New Product' }],
    subtitle: () => 'Add a new product to your catalog.',
  },
  {
    path: '/products',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Products' }],
    subtitle: () => 'Manage product catalog, pricing, and stock settings.',
  },
  {
    path: '/plants/new',
    buildItems: (ctx) => [homeItem(ctx), settingsItem(), { label: 'Shops', href: '/plants' }, { label: 'New Shop' }],
    subtitle: () => 'Create a new shop and assign storage locations.',
  },
  {
    path: '/plants',
    buildItems: (ctx) => [homeItem(ctx), settingsItem(), { label: 'Shops' }],
    subtitle: () => 'Maintain plant and shop locations for inventory.',
  },
  {
    path: '/storage-locations/new',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Storage Locations', href: '/storage-locations' }, { label: 'New Location' }],
    subtitle: () => 'Add storage areas and bins for stock placement.',
  },
  {
    path: '/storage-locations',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Storage Locations' }],
    subtitle: () => 'Organize bins and storage areas by plant.',
  },
  {
    path: '/goods-receipts/new',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Goods Receipts', href: '/goods-receipts' }, { label: 'New Receipt' }],
    subtitle: () => 'Record incoming stock from suppliers.',
  },
  {
    path: '/goods-receipts',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Goods Receipts' }],
    subtitle: () => 'Track incoming inventory and supplier receipts.',
  },
  {
    path: '/goods-issues/new',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Goods Issues', href: '/goods-issues' }, { label: 'New Issue' }],
    subtitle: () => 'Create a new outbound goods issue.',
  },
  {
    path: '/goods-issues',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Goods Issues' }],
    subtitle: () => 'Track outbound dispatches and stock issues.',
  },
  {
    path: '/stock-transfers/new',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Stock Transfers', href: '/stock-transfers' }, { label: 'New Transfer' }],
    subtitle: () => 'Move stock between plants and locations.',
  },
  {
    path: '/stock-transfers',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Stock Transfers' }],
    subtitle: () => 'Manage inter-plant inventory transfers.',
  },
  {
    path: '/warehouse',
    buildItems: (ctx) => [homeItem(ctx), inventoryItem(), { label: 'Warehouse' }],
    subtitle: () => 'Warehouse KPIs, stock status, and movements.',
  },
  {
    path: '/suppliers/new',
    buildItems: (ctx) => [homeItem(ctx), procurementItem(), { label: 'Suppliers', href: '/suppliers' }, { label: 'New Supplier' }],
    subtitle: () => 'Add a new supplier profile.',
  },
  {
    path: '/suppliers',
    buildItems: (ctx) => [homeItem(ctx), procurementItem(), { label: 'Suppliers' }],
    subtitle: () => 'Manage supplier directory and contact details.',
  },
  {
    path: '/rfqs/new',
    buildItems: (ctx) => [homeItem(ctx), procurementItem(), { label: 'RFQs', href: '/rfqs' }, { label: 'New RFQ' }],
    subtitle: () => 'Create a request for quotation.',
  },
  {
    path: '/rfqs/:id/compare',
    buildItems: (ctx) => [
      homeItem(ctx),
      procurementItem(),
      { label: 'RFQs', href: '/rfqs' },
      { label: ctx.labels.rfqNumber ?? 'RFQ', href: ctx.params.id ? `/rfqs/${ctx.params.id}` : '/rfqs' },
      { label: 'Compare' },
    ],
    subtitle: () => 'Compare supplier quotations and allocations.',
  },
  {
    path: '/rfqs/:id',
    buildItems: (ctx) => [
      homeItem(ctx),
      procurementItem(),
      { label: 'RFQs', href: '/rfqs' },
      { label: ctx.labels.rfqNumber ?? 'RFQ' },
    ],
    subtitle: () => 'Review RFQ details, suppliers, and bids.',
  },
  {
    path: '/rfqs',
    buildItems: (ctx) => [homeItem(ctx), procurementItem(), { label: 'RFQs' }],
    subtitle: () => 'Create, track, and manage supplier RFQs.',
  },
  {
    path: '/purchase-orders/new',
    buildItems: (ctx) => [
      homeItem(ctx),
      procurementItem(),
      { label: 'Purchase Orders', href: '/purchase-orders' },
      { label: 'New Purchase Order' },
    ],
    subtitle: () => 'Create a new supplier purchase order.',
  },
  {
    path: '/purchase-orders',
    buildItems: (ctx) => [homeItem(ctx), procurementItem(), { label: 'Purchase Orders' }],
    subtitle: () => 'Manage supplier purchase orders and receiving.',
  },
  {
    path: '/contracts/new',
    buildItems: (ctx) => [homeItem(ctx), procurementItem(), { label: 'Contracts', href: '/contracts' }, { label: 'New Contract' }],
    subtitle: () => 'Create a supplier contract.',
  },
  {
    path: '/contracts',
    buildItems: (ctx) => [homeItem(ctx), procurementItem(), { label: 'Contracts' }],
    subtitle: () => 'Create and activate supplier contracts.',
  },
  {
    path: '/supplier-bills',
    buildItems: (ctx) => [homeItem(ctx), procurementItem(), { label: 'Supplier Bills' }],
    subtitle: () => 'Track bills received from suppliers.',
  },
  {
    path: '/supplier-payments',
    buildItems: (ctx) => [homeItem(ctx), procurementItem(), { label: 'Supplier Payments' }],
    subtitle: () => 'Manage payments to suppliers.',
  },
  {
    path: '/customers/new',
    buildItems: (ctx) => [homeItem(ctx), salesItem(), { label: 'Customers', href: '/customers' }, { label: 'New Customer' }],
    subtitle: () => 'Add a new customer profile.',
  },
  {
    path: '/customers',
    buildItems: (ctx) => [homeItem(ctx), salesItem(), { label: 'Customers' }],
    subtitle: () => 'Maintain customer records and contacts.',
  },
  {
    path: '/sales/new',
    buildItems: (ctx) => [homeItem(ctx), salesItem(), { label: 'Orders', href: '/sales' }, { label: 'New Sales Order' }],
    subtitle: () => 'Create a new sales order.',
  },
  {
    path: '/sales/:id',
    buildItems: (ctx) => [
      homeItem(ctx),
      salesItem(),
      { label: 'Orders', href: '/sales' },
      { label: ctx.labels.salesOrderNumber ?? 'Sales Order' },
    ],
    subtitle: () => 'Review order status, items, and fulfillment.',
  },
  {
    path: '/sales',
    buildItems: (ctx) => [homeItem(ctx), salesItem(), { label: 'Orders' }],
    subtitle: () => 'Manage customer sales orders.',
  },
  {
    path: '/quotations/new',
    buildItems: (ctx) => [homeItem(ctx), salesItem(), { label: 'Quotations', href: '/quotations' }, { label: 'New Quotation' }],
    subtitle: () => 'Prepare a new sales quotation.',
  },
  {
    path: '/quotations',
    buildItems: (ctx) => [homeItem(ctx), salesItem(), { label: 'Quotations' }],
    subtitle: () => 'Manage sales quotations and follow-ups.',
  },
  {
    path: '/invoices/new',
    buildItems: (ctx) => [homeItem(ctx), salesItem(), { label: 'Invoices', href: '/invoices' }, { label: 'New Invoice' }],
    subtitle: () => 'Create a new customer invoice.',
  },
  {
    path: '/invoices',
    buildItems: (ctx) => [homeItem(ctx), salesItem(), { label: 'Invoices' }],
    subtitle: () => 'Issue and track customer invoices.',
  },
  {
    path: '/payments/new',
    buildItems: (ctx) => [homeItem(ctx), salesItem(), { label: 'Payments', href: '/payments' }, { label: 'Record Payment' }],
    subtitle: () => 'Record a new payment receipt.',
  },
  {
    path: '/payments',
    buildItems: (ctx) => [homeItem(ctx), salesItem(), { label: 'Payments' }],
    subtitle: () => 'Track inbound customer payments.',
  },
  {
    path: '/reports',
    buildItems: (ctx) => {
      const tab = ctx.searchParams.get('tab') ?? 'executive-summary';
      const label = reportTabMeta[tab]?.label ?? reportTabMeta['executive-summary'].label;
      return [homeItem(ctx), reportsItem(), { label }];
    },
    subtitle: (ctx) => {
      const tab = ctx.searchParams.get('tab') ?? 'executive-summary';
      return reportTabMeta[tab]?.subtitle ?? reportTabMeta['executive-summary'].subtitle;
    },
  },
  {
    path: '/settings',
    buildItems: (ctx) => [homeItem(ctx), settingsItem(), { label: 'Settings' }],
    subtitle: () => 'Organisation preferences, roles, and email setup.',
  },
  {
    path: '/companies',
    buildItems: (ctx) => [homeItem(ctx), settingsItem(), { label: 'Organization' }],
    subtitle: () => 'Manage organisation details and registration.',
  },
];
