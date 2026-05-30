import * as XLSX from 'xlsx';

export const PRODUCT_IMPORT_COLUMNS = [
  'Shop',
  'Storage Location Code',
  'Product Code',
  'Description',
  'Category',
  'HSN Code',
  'Material Group',
  'Drawing Reference',
  'Brand',
  'Tax Preference',
  'Purchase Price',
  'Selling Price',
  'Opening Stock',
  'Batch Number',
  'Expiry Date',
  'Min Stock Level',
  'Max Stock Level',
  'Reorder Qty',
  'Unit of Measure',
  'Active Status',
] as const;

export type ProductImportStorageLocationRef = {
  shopNumber: string;
  shopName: string;
  code: string;
  name: string;
  isActive?: boolean;
};

export type ProductImportTemplateOptions = {
  /** When set, Shop column is omitted from the sheet (shop user). */
  fixedShopNumber?: string;
  sampleShopNumber?: string;
  /** Example location code for the sample plant (from Storage Locations sheet). */
  sampleStorageLocationCode?: string;
  categories?: string[];
  shopNumbers?: string[];
  storageLocations?: ProductImportStorageLocationRef[];
};

function buildInstructionsRows(options: ProductImportTemplateOptions): string[][] {
  const rows: string[][] = [
    ['Retail IMS — Product bulk upload template'],
    [''],
    ['How to use'],
    ['1. Fill the "Products" sheet — one row per SKU per plant. Do not change column headers.'],
    ['2. Product Code updates an existing SKU when it matches; leave it blank to create a new SKU automatically.'],
    ['3. Use Validate file first to check all rows, then Upload to commit the same backend validation rules.'],
    ['4. Category must match an existing category in Settings / product categories.'],
    ['5. Storage Location Code must match a code on the "Storage Locations" sheet for that plant.'],
    ['6. If a plant has only one active storage location, you may leave Storage Location Code blank.'],
    ['7. Opening Stock sets the target stock for that SKU in the selected plant during upload.'],
    ['8. Batch Number and Expiry Date are required when Opening Stock is greater than zero (YYYY-MM-DD).'],
    ['9. Active Status: true / false (or yes / no / 1 / 0).'],
    ['10. Save as .xlsx and use Upload on the Products page.'],
    [''],
    ['Column guide'],
    ['Shop', 'Plant code or name (admins only). Leave blank if you only have one plant.'],
    [
      'Storage Location Code',
      'Required when the plant has multiple locations. Use codes from the Storage Locations sheet (e.g. SL-01).',
    ],
    ['Product Code', 'Optional. Existing SKU updates that product; blank creates a new SKU automatically'],
    ['Description', 'Required. Product name / description'],
    ['Category', 'Required. Must match a configured category'],
    ['HSN Code', 'Optional. 4, 6, or 8 digits (GST HSN)'],
    ['Material Group', 'Optional'],
    ['Drawing Reference', 'Optional'],
    ['Brand', 'Optional. Manufacturer or brand name'],
    ['Tax Preference', 'Optional. Taxable or Non-Taxable (default: Taxable)'],
    ['Purchase Price', 'Required. Number >= 0'],
    ['Selling Price', 'Required. Number >= 0'],
    ['Opening Stock', 'Required. Target stock quantity for the selected plant during upload'],
    ['Batch Number', 'Required when Opening Stock > 0'],
    ['Expiry Date', 'Required when Opening Stock > 0. Format: YYYY-MM-DD'],
    ['Min Stock Level', 'Required. Low-stock alert threshold'],
    ['Max Stock Level', 'Optional. Maximum stock target'],
    ['Reorder Qty', 'Optional. Suggested reorder quantity'],
    ['Unit of Measure', 'Required. e.g. pcs, kg, L'],
    ['Active Status', 'true or false'],
  ];

  if (options.fixedShopNumber) {
    rows.push([''], ['Your plant', options.fixedShopNumber, '(Shop column not needed on each row)']);
  }

  if (options.categories?.length) {
    rows.push([''], ['Valid categories'], ...options.categories.map((c) => ['', c]));
  }

  if (options.shopNumbers?.length) {
    rows.push([''], ['Valid shop / plant codes'], ...options.shopNumbers.map((s) => ['', s]));
  }

  return rows;
}

function buildStorageLocationRows(
  locations: ProductImportStorageLocationRef[],
): Record<string, string>[] {
  return locations.map((loc) => ({
    'Plant Number': loc.shopNumber,
    'Plant Name': loc.shopName,
    'Location Code': loc.code,
    'Location Name': loc.name,
    Active: loc.isActive === false ? 'false' : 'true',
  }));
}

function buildSampleRows(options: ProductImportTemplateOptions): Record<string, string | number>[] {
  const shop = options.sampleShopNumber ?? '';
  const category = options.categories?.[0] ?? 'General';
  const locationCode = options.sampleStorageLocationCode ?? '';

  return [
    {
      Shop: shop,
      'Storage Location Code': locationCode,
      'Product Code': 'PRD001',
      Description: 'Sample product A',
      Category: category,
      'HSN Code': '84314900',
      'Material Group': '',
      'Drawing Reference': '',
      Brand: 'Sample Brand',
      'Tax Preference': 'Taxable',
      'Purchase Price': 100,
      'Selling Price': 120,
      'Opening Stock': 50,
      'Batch Number': 'BATCH-001',
      'Expiry Date': '2027-12-31',
      'Min Stock Level': 10,
      'Max Stock Level': 200,
      'Reorder Qty': 25,
      'Unit of Measure': 'pcs',
      'Active Status': 'true',
    },
    {
      Shop: shop,
      'Storage Location Code': locationCode,
      'Product Code': '',
      Description: 'Sample product B',
      Category: category,
      'HSN Code': '',
      'Material Group': 'Consumables',
      'Drawing Reference': 'DWG-100',
      Brand: '',
      'Tax Preference': 'Non-Taxable',
      'Purchase Price': 250,
      'Selling Price': 299,
      'Opening Stock': 0,
      'Batch Number': '',
      'Expiry Date': '',
      'Min Stock Level': 5,
      'Max Stock Level': '',
      'Reorder Qty': 10,
      'Unit of Measure': 'pcs',
      'Active Status': 'true',
    },
  ];
}

export function downloadProductImportTemplate(options: ProductImportTemplateOptions = {}) {
  const columns = options.fixedShopNumber
    ? PRODUCT_IMPORT_COLUMNS.filter((c) => c !== 'Shop')
    : [...PRODUCT_IMPORT_COLUMNS];

  const instructionsSheet = XLSX.utils.aoa_to_sheet(buildInstructionsRows(options));
  instructionsSheet['!cols'] = [{ wch: 22 }, { wch: 52 }];

  const samples = buildSampleRows(options).map((row) => {
    if (options.fixedShopNumber) {
      const { Shop: _removed, ...rest } = row;
      return rest;
    }
    return row;
  });

  const productsSheet = XLSX.utils.json_to_sheet(samples, { header: columns });
  productsSheet['!cols'] = columns.map((col) => ({
    wch:
      col === 'Description'
        ? 28
        : col === 'Product Code'
          ? 14
          : col === 'Storage Location Code'
            ? 22
            : 16,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');

  const locationRows = options.storageLocations ?? [];
  if (locationRows.length > 0) {
    const locationsSheet = XLSX.utils.json_to_sheet(buildStorageLocationRows(locationRows), {
      header: ['Plant Number', 'Plant Name', 'Location Code', 'Location Name', 'Active'],
    });
    locationsSheet['!cols'] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 16 },
      { wch: 28 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(workbook, locationsSheet, 'Storage Locations');
  }

  XLSX.writeFile(workbook, 'products-upload-template.xlsx');
}
