import {
  Prisma,
  PrismaClient,
  RoleName,
  DocumentStatus,
  PurchaseOrderStatus,
  TransactionType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Admin@123';

type DemoProductInput = {
  shopId: string;
  productCode: string;
  description: string;
  category: string;
  uom: string;
  purchasePrice: number;
  sellingPrice: number;
  minStockLevel: number;
  openingStock: number;
  reorderQty: number;
  createdById: string;
};

type ReceiptItemInput = {
  productId: string;
  quantity: number;
  purchaseRate: number;
};

type IssueItemInput = {
  productId: string;
  quantity: number;
  availableStockSnapshot: number;
};

type PurchaseOrderItemInput = {
  productId: string;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  orderQty: number;
  rate: number;
};

async function ensureRole(name: RoleName, permissions: string[]) {
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) return existing;

  return prisma.role.create({
    data: {
      name,
      permissions,
    },
  });
}

async function ensureShop(data: {
  shopNumber: string;
  shopName: string;
  address: string;
  contactPerson: string;
  mobile: string;
  email: string;
}) {
  const existing = await prisma.shop.findUnique({
    where: { shopNumber: data.shopNumber },
  });
  if (existing) return existing;

  return prisma.shop.create({ data });
}

async function ensureUser(data: {
  email: string;
  name: string;
  roleId: string;
  shopId?: string;
}) {
  const email = data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.user.create({
    data: {
      email,
      name: data.name,
      passwordHash,
      roleId: data.roleId,
      shopId: data.shopId,
      isActive: true,
    },
  });
}

async function ensureSystemSetting(key: string, value: Prisma.InputJsonValue) {
  const existing = await prisma.systemSetting.findUnique({ where: { key } });
  if (existing) return existing;

  return prisma.systemSetting.create({
    data: {
      key,
      value,
    },
  });
}

async function ensureProduct(input: DemoProductInput) {
  // Multi-plant: one Product master row + one ProductPlant assignment for
  // input.shopId. If the same productCode is referenced from two demo
  // shops we just add a second assignment to the existing master.
  const existingProduct = await prisma.product.findUnique({
    where: { productCode: input.productCode },
  });

  const product =
    existingProduct ??
    (await prisma.product.create({
      data: {
        productCode: input.productCode,
        description: input.description,
        uom: input.uom,
        category: input.category,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        isActive: true,
        createdById: input.createdById,
      },
    }));

  const existingAssignment = await prisma.productPlant.findUnique({
    where: { productId_shopId: { productId: product.id, shopId: input.shopId } },
  });
  if (!existingAssignment) {
    await prisma.productPlant.create({
      data: {
        productId: product.id,
        shopId: input.shopId,
        openingStock: input.openingStock,
        minStockLevel: input.minStockLevel,
        reorderQty: input.reorderQty,
        isActive: true,
        createdById: input.createdById,
      },
    });
    if (input.openingStock > 0) {
      await prisma.stockLedger.create({
        data: {
          transactionType: TransactionType.OPENING,
          transactionRef: `OPENING-${product.productCode}-${input.shopId.slice(0, 8)}`,
          transactionDate: new Date('2026-05-01'),
          inQty: new Prisma.Decimal(input.openingStock),
          outQty: new Prisma.Decimal(0),
          balanceQty: new Prisma.Decimal(input.openingStock),
          remarks: 'Additive demo opening stock',
          createdById: input.createdById,
          shop: { connect: { id: input.shopId } },
          product: { connect: { id: product.id } },
        },
      });
    }
  }

  return product;
}

async function ensurePostedGoodsReceipt(data: {
  grNumber: string;
  grDate: string;
  shopId: string;
  supplierName: string;
  supplierRef?: string;
  items: ReceiptItemInput[];
  createdById: string;
}) {
  const existing = await prisma.goodsReceiptHeader.findUnique({
    where: { grNumber: data.grNumber },
  });
  if (existing) return existing;

  const totalValue = data.items.reduce(
    (sum, item) => sum + item.quantity * item.purchaseRate,
    0,
  );

  const header = await prisma.goodsReceiptHeader.create({
    data: {
      grNumber: data.grNumber,
      grDate: new Date(data.grDate),
      shopId: data.shopId,
      supplierName: data.supplierName,
      supplierRef: data.supplierRef,
      status: DocumentStatus.POSTED,
      postedAt: new Date(data.grDate),
      totalValue,
      createdById: data.createdById,
    },
  });

  await prisma.goodsReceiptItem.createMany({
    data: data.items.map((item) => ({
      grHeaderId: header.id,
      productId: item.productId,
      quantity: item.quantity,
      uom: 'UNIT',
      purchaseRate: item.purchaseRate,
      lineValue: item.quantity * item.purchaseRate,
      createdById: data.createdById,
    })),
  });

  for (const item of data.items) {
    await prisma.stockLedger.create({
      data: {
        transactionType: TransactionType.GOODS_RECEIPT,
        transactionRef: data.grNumber,
        transactionDate: new Date(data.grDate),
        inQty: new Prisma.Decimal(item.quantity),
        outQty: new Prisma.Decimal(0),
        balanceQty: new Prisma.Decimal(0),
        unitRate: item.purchaseRate,
        value: item.quantity * item.purchaseRate,
        createdById: data.createdById,
        shop: { connect: { id: data.shopId } },
        product: { connect: { id: item.productId } },
      },
    });
  }

  return header;
}

async function ensureDraftGoodsReceipt(data: {
  grNumber: string;
  grDate: string;
  shopId: string;
  supplierName: string;
  items: ReceiptItemInput[];
  createdById: string;
}) {
  const existing = await prisma.goodsReceiptHeader.findUnique({
    where: { grNumber: data.grNumber },
  });
  if (existing) return existing;

  const totalValue = data.items.reduce(
    (sum, item) => sum + item.quantity * item.purchaseRate,
    0,
  );

  return prisma.goodsReceiptHeader.create({
    data: {
      grNumber: data.grNumber,
      grDate: new Date(data.grDate),
      shopId: data.shopId,
      supplierName: data.supplierName,
      status: DocumentStatus.DRAFT,
      totalValue,
      createdById: data.createdById,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          uom: 'UNIT',
          purchaseRate: item.purchaseRate,
          lineValue: item.quantity * item.purchaseRate,
          createdById: data.createdById,
        })),
      },
    },
  });
}

async function ensureGoodsIssue(data: {
  giNumber: string;
  giDate: string;
  shopId: string;
  issueReason: string;
  status: DocumentStatus;
  items: IssueItemInput[];
  createdById: string;
}) {
  const existing = await prisma.goodsIssueHeader.findUnique({
    where: { giNumber: data.giNumber },
  });
  if (existing) return existing;

  const header = await prisma.goodsIssueHeader.create({
    data: {
      giNumber: data.giNumber,
      giDate: new Date(data.giDate),
      shopId: data.shopId,
      issueReason: data.issueReason,
      status: data.status,
      postedAt: data.status === DocumentStatus.POSTED ? new Date(data.giDate) : null,
      createdById: data.createdById,
    },
  });

  await prisma.goodsIssueItem.createMany({
    data: data.items.map((item) => ({
      giHeaderId: header.id,
      productId: item.productId,
      quantity: item.quantity,
      uom: 'UNIT',
      availableStockSnapshot: item.availableStockSnapshot,
      createdById: data.createdById,
    })),
  });

  if (data.status === DocumentStatus.POSTED) {
    for (const item of data.items) {
      await prisma.stockLedger.create({
        data: {
          transactionType: TransactionType.GOODS_ISSUE,
          transactionRef: data.giNumber,
          transactionDate: new Date(data.giDate),
          inQty: new Prisma.Decimal(0),
          outQty: new Prisma.Decimal(item.quantity),
          balanceQty: new Prisma.Decimal(0),
          createdById: data.createdById,
          shop: { connect: { id: data.shopId } },
          product: { connect: { id: item.productId } },
        },
      });
    }
  }

  return header;
}

async function ensureDamagedStock(data: {
  damageNumber: string;
  damageDate: string;
  shopId: string;
  productId: string;
  damagedQuantity: number;
  reason: string;
  status: DocumentStatus;
  createdById: string;
}) {
  const existing = await prisma.damagedStock.findUnique({
    where: { damageNumber: data.damageNumber },
  });
  if (existing) return existing;

  const record = await prisma.damagedStock.create({
    data: {
      damageNumber: data.damageNumber,
      damageDate: new Date(data.damageDate),
      shopId: data.shopId,
      productId: data.productId,
      damagedQuantity: data.damagedQuantity,
      reason: data.reason,
      status: data.status,
      postedAt: data.status === DocumentStatus.POSTED ? new Date(data.damageDate) : null,
      createdById: data.createdById,
    },
  });

  if (data.status === DocumentStatus.POSTED) {
    await prisma.stockLedger.create({
      data: {
        transactionType: TransactionType.DAMAGE,
        transactionRef: data.damageNumber,
        transactionDate: new Date(data.damageDate),
        inQty: new Prisma.Decimal(0),
        outQty: new Prisma.Decimal(data.damagedQuantity),
        balanceQty: new Prisma.Decimal(0),
        createdById: data.createdById,
        shop: { connect: { id: data.shopId } },
        product: { connect: { id: data.productId } },
      },
    });
  }

  return record;
}

async function ensurePurchaseOrder(data: {
  poNumber: string;
  poDate: string;
  shopId: string;
  supplier: string;
  status: PurchaseOrderStatus;
  remarks?: string;
  items: PurchaseOrderItemInput[];
  createdById: string;
}) {
  const existing = await prisma.purchaseOrderHeader.findUnique({
    where: { poNumber: data.poNumber },
  });
  if (existing) return existing;

  const totalValue = data.items.reduce(
    (sum, item) => sum + item.orderQty * item.rate,
    0,
  );

  return prisma.purchaseOrderHeader.create({
    data: {
      poNumber: data.poNumber,
      poDate: new Date(data.poDate),
      shopId: data.shopId,
      supplier: data.supplier,
      status: data.status,
      remarks: data.remarks,
      totalValue,
      createdById: data.createdById,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          currentStock: item.currentStock,
          minStock: item.minStock,
          suggestedQty: item.suggestedQty,
          orderQty: item.orderQty,
          rate: item.rate,
          lineValue: item.orderQty * item.rate,
          createdById: data.createdById,
        })),
      },
    },
  });
}

async function ensureDocumentSequence(data: {
  docType: string;
  shopId: string;
  yearMonth: string;
  lastSeq: number;
}) {
  const existing = await prisma.documentSequence.findFirst({
    where: {
      docType: data.docType,
      shopId: data.shopId,
      yearMonth: data.yearMonth,
    },
  });

  if (!existing) {
    return prisma.documentSequence.create({ data });
  }

  if (existing.lastSeq >= data.lastSeq) {
    return existing;
  }

  return prisma.documentSequence.update({
    where: { id: existing.id },
    data: { lastSeq: data.lastSeq },
  });
}

async function main() {
  const adminPerms = [
    'shop:read',
    'shop:write',
    'product:read',
    'product:write',
    'goods_receipt:create',
    'goods_receipt:read',
    'goods_issue:create',
    'goods_issue:read',
    'damage:create',
    'damage:read',
    'purchase_order:create',
    'purchase_order:read',
    'report:view',
    'report:export',
    'user:manage',
    'audit_log:read',
  ];
  const invPerms = [
    'shop:read',
    'product:read',
    'goods_receipt:read',
    'goods_issue:read',
    'damage:read',
    'purchase_order:create',
    'purchase_order:read',
    'report:view',
    'report:export',
  ];
  const shopPerms = [
    'shop:read',
    'product:read',
    'goods_receipt:create',
    'goods_receipt:read',
    'goods_issue:create',
    'goods_issue:read',
    'damage:create',
    'damage:read',
    'report:view',
  ];

  const adminRole = await ensureRole(RoleName.ADMIN, adminPerms);
  const inventoryRole = await ensureRole(RoleName.INVENTORY_MANAGER, invPerms);
  const shopRole = await ensureRole(RoleName.SHOP_USER, shopPerms);

  const shop3 = await ensureShop({
    shopNumber: 'SH-003',
    shopName: 'Galle Outlet',
    address: '78 Lighthouse Rd, Galle',
    contactPerson: 'Saman Fonseka',
    mobile: '+94777123456',
    email: 'galle@retailims.com',
  });

  const shop4 = await ensureShop({
    shopNumber: 'SH-004',
    shopName: 'Negombo Mini',
    address: '12 Sea St, Negombo',
    contactPerson: 'Ruwan Dias',
    mobile: '+94775554433',
    email: 'negombo@retailims.com',
  });

  const admin =
    (await prisma.user.findUnique({
      where: { email: 'admin@retailims.com' },
    })) ??
    (await ensureUser({
      email: 'admin@retailims.com',
      name: 'System Admin',
      roleId: adminRole.id,
    }));

  await ensureUser({
    email: 'shop3@retailims.com',
    name: 'Galle Shop User',
    roleId: shopRole.id,
    shopId: shop3.id,
  });

  await ensureUser({
    email: 'shop4@retailims.com',
    name: 'Negombo Shop User',
    roleId: shopRole.id,
    shopId: shop4.id,
  });

  await ensureUser({
    email: 'inventory.assistant@retailims.com',
    name: 'Inventory Assistant',
    roleId: inventoryRole.id,
  });

  await ensureSystemSetting('reorder_formula', { formula: 'FILL_TO_2X_MIN' });
  await ensureSystemSetting('company_profile', {
    companyName: 'SoftdigitIMS Demo',
    taxNumber: 'TIN-2026-DEMO',
    currency: 'LKR',
  });

  const demoProducts = [
    {
      shopId: shop3.id,
      productCode: 'BIS-001',
      description: 'Butter Biscuits 300g',
      category: 'Grocery',
      uom: 'UNIT',
      purchasePrice: 220,
      sellingPrice: 320,
      minStockLevel: 20,
      openingStock: 75,
      reorderQty: 18,
      createdById: admin.id,
    },
    {
      shopId: shop3.id,
      productCode: 'MILK-01',
      description: 'Full Cream Milk 400g',
      category: 'Grocery',
      uom: 'UNIT',
      purchasePrice: 410,
      sellingPrice: 560,
      minStockLevel: 18,
      openingStock: 40,
      reorderQty: 12,
      createdById: admin.id,
    },
    {
      shopId: shop3.id,
      productCode: 'JUICE-1',
      description: 'Orange Juice 1L',
      category: 'Beverages',
      uom: 'UNIT',
      purchasePrice: 260,
      sellingPrice: 390,
      minStockLevel: 14,
      openingStock: 30,
      reorderQty: 10,
      createdById: admin.id,
    },
    {
      shopId: shop3.id,
      productCode: 'BAT-001',
      description: 'AA Batteries 4 Pack',
      category: 'Electronics',
      uom: 'UNIT',
      purchasePrice: 300,
      sellingPrice: 450,
      minStockLevel: 15,
      openingStock: 9,
      reorderQty: 10,
      createdById: admin.id,
    },
    {
      shopId: shop3.id,
      productCode: 'RINSE-1',
      description: 'Fabric Softener 500ml',
      category: 'Household',
      uom: 'UNIT',
      purchasePrice: 210,
      sellingPrice: 310,
      minStockLevel: 10,
      openingStock: 22,
      reorderQty: 8,
      createdById: admin.id,
    },
    {
      shopId: shop4.id,
      productCode: 'NOTE-01',
      description: 'A5 Notebook',
      category: 'Others',
      uom: 'UNIT',
      purchasePrice: 95,
      sellingPrice: 150,
      minStockLevel: 25,
      openingStock: 60,
      reorderQty: 20,
      createdById: admin.id,
    },
    {
      shopId: shop4.id,
      productCode: 'PEN-001',
      description: 'Blue Ballpoint Pen',
      category: 'Others',
      uom: 'UNIT',
      purchasePrice: 35,
      sellingPrice: 60,
      minStockLevel: 40,
      openingStock: 120,
      reorderQty: 40,
      createdById: admin.id,
    },
    {
      shopId: shop4.id,
      productCode: 'CABLE-1',
      description: 'USB-C Charging Cable',
      category: 'Electronics',
      uom: 'UNIT',
      purchasePrice: 280,
      sellingPrice: 420,
      minStockLevel: 12,
      openingStock: 28,
      reorderQty: 10,
      createdById: admin.id,
    },
  ] satisfies DemoProductInput[];

  for (const product of demoProducts) {
    await ensureProduct(product);
  }

  // Multi-plant: thresholds (openingStock, minStockLevel) live on
  // ProductPlant. Pull each (product, plant) assignment so the demo refs
  // below can still look up "product code at shop X".
  const assignments = await prisma.productPlant.findMany({
    include: {
      product: { select: { id: true, productCode: true, purchasePrice: true } },
    },
  });

  const productByKey = new Map(
    assignments.map((a) => [
      `${a.shopId}:${a.product.productCode}`,
      {
        id: a.product.id,
        shopId: a.shopId,
        productCode: a.product.productCode,
        openingStock: a.openingStock,
        minStockLevel: a.minStockLevel,
        purchasePrice: a.product.purchasePrice,
      },
    ] as const),
  );

  const sugar = productByKey.get('9a022519-dbc4-457f-8e96-22f0f2363d09:SUGAR-1');
  const cleaner = productByKey.get('9a022519-dbc4-457f-8e96-22f0f2363d09:CLN-01');
  const kandyTea = productByKey.get('9a022519-dbc4-457f-8e96-22f0f2363d09:TEA-001');
  const biscuits = productByKey.get(`${shop3.id}:BIS-001`);
  const milk = productByKey.get(`${shop3.id}:MILK-01`);
  const juice = productByKey.get(`${shop3.id}:JUICE-1`);
  const batteries = productByKey.get(`${shop3.id}:BAT-001`);
  const oil = productByKey.get('4116b72b-fdd4-4bd3-8584-5a4637a8472b:OIL-01');

  if (!sugar || !cleaner || !kandyTea || !biscuits || !milk || !juice || !batteries || !oil) {
    throw new Error('Expected demo products are missing after additive setup');
  }

  await ensurePostedGoodsReceipt({
    grNumber: 'GR-202605-00001',
    grDate: '2026-05-03',
    shopId: '9a022519-dbc4-457f-8e96-22f0f2363d09',
    supplierName: 'Hill Country Traders',
    supplierRef: 'HC-7781',
    createdById: admin.id,
    items: [
      { productId: sugar.id, quantity: 25, purchaseRate: 180 },
      { productId: cleaner.id, quantity: 12, purchaseRate: 310 },
    ],
  });

  await ensureDraftGoodsReceipt({
    grNumber: 'GR-202605-00002',
    grDate: '2026-05-06',
    shopId: shop3.id,
    supplierName: 'Southern Distributors',
    createdById: admin.id,
    items: [{ productId: milk.id, quantity: 6, purchaseRate: 410 }],
  });

  await ensureGoodsIssue({
    giNumber: 'GI-202605-00001',
    giDate: '2026-05-07',
    shopId: '9a022519-dbc4-457f-8e96-22f0f2363d09',
    issueReason: 'Retail sales',
    status: DocumentStatus.POSTED,
    createdById: admin.id,
    items: [
      {
        productId: kandyTea.id,
        quantity: 4,
        availableStockSnapshot: Number(kandyTea.openingStock),
      },
    ],
  });

  await ensureGoodsIssue({
    giNumber: 'GI-202605-00002',
    giDate: '2026-05-09',
    shopId: shop3.id,
    issueReason: 'Staff consumption',
    status: DocumentStatus.DRAFT,
    createdById: admin.id,
    items: [
      {
        productId: biscuits.id,
        quantity: 2,
        availableStockSnapshot: Number(biscuits.openingStock),
      },
    ],
  });

  await ensureDamagedStock({
    damageNumber: 'DM-202605-00001',
    damageDate: '2026-05-10',
    shopId: '9a022519-dbc4-457f-8e96-22f0f2363d09',
    productId: cleaner.id,
    damagedQuantity: 1,
    reason: 'Packaging leak',
    status: DocumentStatus.POSTED,
    createdById: admin.id,
  });

  await ensureDamagedStock({
    damageNumber: 'DM-202605-00002',
    damageDate: '2026-05-11',
    shopId: shop3.id,
    productId: juice.id,
    damagedQuantity: 2,
    reason: 'Damaged in transit',
    status: DocumentStatus.POSTED,
    createdById: admin.id,
  });

  await ensurePurchaseOrder({
    poNumber: 'PO-202605-00001',
    poDate: '2026-05-12',
    shopId: '4116b72b-fdd4-4bd3-8584-5a4637a8472b',
    supplier: 'Metro Supplies',
    status: PurchaseOrderStatus.CONFIRMED,
    remarks: 'Confirmed demo replenishment order',
    createdById: admin.id,
    items: [
      {
        productId: oil.id,
        currentStock: Number(oil.openingStock),
        minStock: Number(oil.minStockLevel),
        suggestedQty: 15,
        orderQty: 15,
        rate: Number(oil.purchasePrice),
      },
    ],
  });

  await ensurePurchaseOrder({
    poNumber: 'PO-202605-00002',
    poDate: '2026-05-15',
    shopId: shop3.id,
    supplier: 'Southline Wholesale',
    status: PurchaseOrderStatus.CANCELLED,
    remarks: 'Cancelled demo order for training',
    createdById: admin.id,
    items: [
      {
        productId: batteries.id,
        currentStock: Number(batteries.openingStock),
        minStock: Number(batteries.minStockLevel),
        suggestedQty: 12,
        orderQty: 12,
        rate: Number(batteries.purchasePrice),
      },
    ],
  });

  await ensureDocumentSequence({
    docType: 'GR',
    shopId: '9a022519-dbc4-457f-8e96-22f0f2363d09',
    yearMonth: '202605',
    lastSeq: 1,
  });
  await ensureDocumentSequence({
    docType: 'GR',
    shopId: shop3.id,
    yearMonth: '202605',
    lastSeq: 2,
  });
  await ensureDocumentSequence({
    docType: 'GI',
    shopId: '9a022519-dbc4-457f-8e96-22f0f2363d09',
    yearMonth: '202605',
    lastSeq: 1,
  });
  await ensureDocumentSequence({
    docType: 'GI',
    shopId: shop3.id,
    yearMonth: '202605',
    lastSeq: 2,
  });
  await ensureDocumentSequence({
    docType: 'DM',
    shopId: '9a022519-dbc4-457f-8e96-22f0f2363d09',
    yearMonth: '202605',
    lastSeq: 1,
  });
  await ensureDocumentSequence({
    docType: 'DM',
    shopId: shop3.id,
    yearMonth: '202605',
    lastSeq: 2,
  });
  await ensureDocumentSequence({
    docType: 'PO',
    shopId: '4116b72b-fdd4-4bd3-8584-5a4637a8472b',
    yearMonth: '202605',
    lastSeq: 1,
  });
  await ensureDocumentSequence({
    docType: 'PO',
    shopId: shop3.id,
    yearMonth: '202605',
    lastSeq: 2,
  });

  const summary = {
    shops: await prisma.shop.count(),
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    goodsReceipts: await prisma.goodsReceiptHeader.count(),
    goodsIssues: await prisma.goodsIssueHeader.count(),
    damagedStocks: await prisma.damagedStock.count(),
    purchaseOrders: await prisma.purchaseOrderHeader.count(),
  };

  console.log('Additive demo data ready');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
