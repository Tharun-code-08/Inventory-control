import { DocumentSeriesRestart } from '@prisma/client';

export type DocumentSeriesModuleDef = {
  docType: string;
  moduleLabel: string;
  defaultPrefix: string;
  defaultStartingNumber: number;
  defaultPadWidth: number;
  defaultRestartPeriod: DocumentSeriesRestart;
  shopScoped: boolean;
  defaultUseCategoryPrefix?: boolean;
};

export const DOCUMENT_SERIES_MODULES: DocumentSeriesModuleDef[] = [
  {
    docType: 'PRD',
    moduleLabel: 'Products',
    defaultPrefix: 'PRD',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
    defaultUseCategoryPrefix: true,
  },
  {
    docType: 'CUS',
    moduleLabel: 'Customers',
    defaultPrefix: 'CUS',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'RFQ',
    moduleLabel: 'RFQ',
    defaultPrefix: 'RFQ',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'QUO',
    moduleLabel: 'Supplier Quotation',
    defaultPrefix: 'QUO',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'CT',
    moduleLabel: 'Contracts',
    defaultPrefix: 'CT',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'PO',
    moduleLabel: 'Purchase Order',
    defaultPrefix: 'PO',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'GR',
    moduleLabel: 'Goods Receipt',
    defaultPrefix: 'GR',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'CRT',
    moduleLabel: 'Goods Return (Customer)',
    defaultPrefix: 'CRT',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'SRT',
    moduleLabel: 'Goods Return (Supplier)',
    defaultPrefix: 'RMO',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'SQT',
    moduleLabel: 'Sales Quotation',
    defaultPrefix: 'QT',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'SO',
    moduleLabel: 'Sales Order',
    defaultPrefix: 'SO',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'GI',
    moduleLabel: 'Goods Issue',
    defaultPrefix: 'GI',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'SC',
    moduleLabel: 'Stock Count',
    defaultPrefix: 'SC',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'INV',
    moduleLabel: 'Invoice',
    defaultPrefix: 'INV',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'RCPT',
    moduleLabel: 'Payment Receipt',
    defaultPrefix: 'RCPT',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'CN',
    moduleLabel: 'Credit Note',
    defaultPrefix: 'CN',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'DM',
    moduleLabel: 'Damaged Stock',
    defaultPrefix: 'DM',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'SBILL',
    moduleLabel: 'Supplier Bill',
    defaultPrefix: 'SBILL',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    docType: 'SPAY',
    moduleLabel: 'Supplier Payment',
    defaultPrefix: 'SPAY',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: false,
  },
  {
    // Stock transfers number via nextShopScopedNumber, so the prefix carries
    // the source shop number (ST-<shopNumber>-…) — hence shopScoped: true.
    docType: 'ST',
    moduleLabel: 'Stock Transfer',
    defaultPrefix: 'ST',
    defaultStartingNumber: 1,
    defaultPadWidth: 5,
    defaultRestartPeriod: DocumentSeriesRestart.NONE,
    shopScoped: true,
  },
];

export const DOCUMENT_SERIES_MODULE_BY_TYPE = new Map(
  DOCUMENT_SERIES_MODULES.map((module) => [module.docType, module]),
);

export function getBuiltInSeriesDefault(docType: string): DocumentSeriesModuleDef | undefined {
  return DOCUMENT_SERIES_MODULE_BY_TYPE.get(docType);
}
