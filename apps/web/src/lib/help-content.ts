export type HelpGuide = {
  id: string;
  title: string;
  steps: string[];
};

export type WorkflowStep = {
  id: string;
  label: string;
  hint?: string;
};

export type WorkflowDefinition = {
  id: string;
  title: string;
  summary: string;
  accent: 'blue' | 'green' | 'orange' | 'violet' | 'teal';
  steps: WorkflowStep[];
};

export const HELP_GUIDES: HelpGuide[] = [
  {
    id: 'create-po',
    title: 'Creating a Purchase Order',
    steps: [
      'Go to Procurement → Purchase Orders.',
      'Click "Create PO" and choose a supplier.',
      'Add line items with quantities, UoM, and expected price.',
      'Set delivery date, payment terms, and plant (shop).',
      'Save as draft, then submit when ready for processing.',
      'Track status from the list or open the PO detail view.',
    ],
  },
  {
    id: 'rfq-bids',
    title: 'Managing RFQs and Bids',
    steps: [
      'Go to Procurement → RFQ / Bids.',
      'Click "Create RFQ", add items, and invite suppliers.',
      'Send the RFQ — suppliers receive a portal link by email.',
      'Collect responses via Supplier Portal or manual entry.',
      'Open "Compare Bids" to score and shortlist responses.',
      'Award the RFQ and convert to a purchase order when ready.',
    ],
  },
  {
    id: 'sales-quote',
    title: 'Creating a Sales Quotation',
    steps: [
      'Go to Sales → Sales Quotations.',
      'Click "Create Quote" and select a customer.',
      'Add line items with product, quantity, and unit price.',
      'Send the quotation to the customer (mark as sent).',
      'When accepted, use "Convert to SO" to create a sales order.',
      'Fulfill the sales order and generate an invoice if needed.',
    ],
  },
  {
    id: 'goods-receipt',
    title: 'Receiving Goods',
    steps: [
      'Go to Warehouse → Goods Receipts.',
      'Click "Create GR" and link to a purchase order when applicable.',
      'Confirm plant, storage location, and line quantities received.',
      'Enter batch or reference numbers if your process requires them.',
      'Post the receipt — on-hand stock updates immediately.',
      'Review stock on Products or Warehouse after posting.',
    ],
  },
  {
    id: 'exports',
    title: 'Downloading PDFs & CSV Exports',
    steps: [
      'Open a Purchase Order or Sales Order detail page.',
      'Click "Download PDF" for a printable document.',
      'On Sales Orders, use "Generate Invoice" after fulfillment when billing.',
      'On list pages (Products, Suppliers, Customers), use "Export CSV".',
      'Reports tab exports use the export action on each report table.',
    ],
  },
  {
    id: 'master-data',
    title: 'Setting Up Companies, Plants & Locations',
    steps: [
      'Go to Master Data → Companies and create your legal entities.',
      'Add Plants (shops) under each company with contact details.',
      'Create Storage Locations per plant for bin-level tracking.',
      'Assign products to plants when creating or editing SKUs.',
      'Shop users only see data scoped to their assigned plant.',
    ],
  },
  {
    id: 'products-stock',
    title: 'Managing Products & Stock Levels',
    steps: [
      'Go to Master Data → Products to create SKUs and categories.',
      'Use plant assignments for min/max and reorder settings.',
      'Bulk upload inventory thresholds via the Excel template.',
      'Low-stock and out-of-stock KPIs appear on the Products page.',
      'Goods receipts increase stock; goods issues decrease it.',
    ],
  },
  {
    id: 'goods-issue',
    title: 'Issuing Goods (Goods Issue)',
    steps: [
      'Go to Warehouse → Goods Issues.',
      'Create a new issue and select the issuing plant.',
      'Search products by code and add quantities to issue.',
      'Post the document to deduct stock from the location.',
      'Cancelled or draft issues do not affect on-hand balances.',
    ],
  },
  {
    id: 'reports',
    title: 'Running Reports',
    steps: [
      'Go to Reports from the sidebar (admin roles).',
      'Choose a tab: inventory, procurement, sales, or movements.',
      'Apply date range and plant filters where available.',
      'Use export actions to download CSV for offline analysis.',
      'Refresh the page header control to reload live metrics.',
    ],
  },
  {
    id: 'jump-menu',
    title: 'Jump Menu & Keyboard Shortcuts',
    steps: [
      'Press Ctrl+K (⌘K on Mac) or tap the compass icon to open Jump.',
      'Type a page name, SKU, supplier, or workflow keyword.',
      'Use arrow keys to move, Enter to navigate, Esc to close.',
      'Fullscreen toggle lives in the top header bar.',
    ],
  },
  {
    id: 'supplier-portal',
    title: 'Supplier Portal Invitations',
    steps: [
      'Ensure suppliers have a valid email in Master Data → Suppliers.',
      'Create an RFQ and add suppliers to the invite list.',
      'Send the RFQ — each supplier gets a secure portal link.',
      'They submit pricing without logging into your main tenant.',
      'Review submissions on RFQ detail and Compare Bids pages.',
    ],
  },
];

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    id: 'procurement',
    title: 'Procurement Lifecycle',
    summary: 'From sourcing request through payment.',
    accent: 'blue',
    steps: [
      { id: '1', label: 'Create RFQ', hint: 'Invite suppliers' },
      { id: '2', label: 'Compare bids', hint: 'Award winner' },
      { id: '3', label: 'Purchase order', hint: 'Draft → submit' },
      { id: '4', label: 'Goods receipt', hint: 'Post stock in' },
      { id: '5', label: 'Invoice & pay', hint: 'Close PO' },
    ],
  },
  {
    id: 'sales',
    title: 'Sales Order Lifecycle',
    summary: 'Quote-to-cash for customer orders.',
    accent: 'green',
    steps: [
      { id: '1', label: 'Sales quotation', hint: 'Send to customer' },
      { id: '2', label: 'Sales order', hint: 'Confirm order' },
      { id: '3', label: 'Fulfillment', hint: 'Pick & ship' },
      { id: '4', label: 'Invoice', hint: 'Bill customer' },
      { id: '5', label: 'Payment', hint: 'Record receipt' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory Management',
    summary: 'How stock moves through the warehouse.',
    accent: 'orange',
    steps: [
      { id: '1', label: 'Product master', hint: 'SKU + plants' },
      { id: '2', label: 'Goods receipt', hint: 'Stock in' },
      { id: '3', label: 'On-hand balance', hint: 'Per location' },
      { id: '4', label: 'Goods issue', hint: 'Stock out' },
      { id: '5', label: 'Reports', hint: 'Audit trail' },
    ],
  },
  {
    id: 'supplier-onboarding',
    title: 'Supplier Onboarding',
    summary: 'Bring a new vendor into procurement.',
    accent: 'violet',
    steps: [
      { id: '1', label: 'Register supplier', hint: 'Master data' },
      { id: '2', label: 'Verify contacts', hint: 'Email & terms' },
      { id: '3', label: 'Trial RFQ', hint: 'Portal invite' },
      { id: '4', label: 'First award', hint: 'PO created' },
      { id: '5', label: 'Active vendor', hint: 'Repeat buys' },
    ],
  },
  {
    id: 'approval',
    title: 'Approval Workflow',
    summary: 'Document review before execution.',
    accent: 'teal',
    steps: [
      { id: '1', label: 'Draft', hint: 'Edit freely' },
      { id: '2', label: 'Submit', hint: 'Request review' },
      { id: '3', label: 'Approve', hint: 'Manager sign-off' },
      { id: '4', label: 'Execute', hint: 'Post / send' },
      { id: '5', label: 'Archive', hint: 'Audit history' },
    ],
  },
];

export const KEYBOARD_SHORTCUTS = [
  { keys: '⌘/Ctrl + K', action: 'Open global jump menu' },
  { keys: 'Esc', action: 'Close dialog, menu, or search' },
  { keys: 'F11 / header button', action: 'Toggle fullscreen' },
  { keys: '↑ ↓ Enter', action: 'Navigate jump menu results' },
] as const;

export const SUPPORT_CONTACT = {
  email: 'office@softdigitconsulting.com',
  company: 'Softdigit Consulting',
  location: 'SoftdigitIMS support',
} as const;
