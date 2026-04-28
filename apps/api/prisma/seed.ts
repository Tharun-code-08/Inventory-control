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

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.contractItem.deleteMany();
  await prisma.contractHeader.deleteMany();
  await prisma.supplierQuotationItem.deleteMany();
  await prisma.supplierQuotationHeader.deleteMany();
  await prisma.rfqItem.deleteMany();
  await prisma.rfqSupplier.deleteMany();
  await prisma.rfqHeader.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.storageLocation.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrderHeader.deleteMany();
  await prisma.goodsReceiptItem.deleteMany();
  await prisma.goodsReceiptHeader.deleteMany();
  await prisma.goodsIssueItem.deleteMany();
  await prisma.goodsIssueHeader.deleteMany();
  await prisma.damagedStock.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.stockSummary.deleteMany();
  await prisma.product.deleteMany();
  await prisma.documentSequence.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.company.deleteMany();
  await prisma.role.deleteMany();
  await prisma.systemSetting.deleteMany();

  const adminPerms = [
    'company:read',
    'company:write',
    'shop:read',
    'shop:write',
    'storage_location:read',
    'storage_location:write',
    'product:read',
    'product:write',
    'supplier:read',
    'supplier:write',
    'rfq:read',
    'rfq:write',
    'quote:read',
    'quote:write',
    'contract:read',
    'contract:write',
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
    'company:read',
    'storage_location:read',
    'supplier:read',
    'rfq:read',
    'rfq:write',
    'quote:read',
    'quote:write',
    'contract:read',
    'contract:write',
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
    'supplier:read',
    'rfq:read',
    'quote:read',
    'contract:read',
    'report:view',
  ];

  const adminRole = await prisma.role.create({
    data: { name: RoleName.ADMIN, permissions: adminPerms },
  });
  const invRole = await prisma.role.create({
    data: { name: RoleName.INVENTORY_MANAGER, permissions: invPerms },
  });
  const shopRole = await prisma.role.create({
    data: { name: RoleName.SHOP_USER, permissions: shopPerms },
  });

  const company1 = await prisma.company.create({
    data: {
      companyCode: 'COMP-001',
      companyName: 'Demo Company',
      address: 'Head Office',
      isActive: true,
    },
  });

  const shop1 = await prisma.shop.create({
    data: {
      shopNumber: 'SH-001',
      shopName: 'Colombo Main',
      address: '123 Main St, Colombo',
      contactPerson: 'Kamal Perera',
      mobile: '+94771234567',
      email: 'colombo@retailims.com',
      companyId: company1.id,
    },
  });
  const shop2 = await prisma.shop.create({
    data: {
      shopNumber: 'SH-002',
      shopName: 'Kandy Branch',
      address: '45 Hill Rd, Kandy',
      contactPerson: 'Nimal Silva',
      mobile: '+94777654321',
      email: 'kandy@retailims.com',
      companyId: company1.id,
    },
  });

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@retailims.com',
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Colombo Shop User',
      email: 'shop1@retailims.com',
      passwordHash,
      roleId: shopRole.id,
      shopId: shop1.id,
      isActive: true,
    },
  });
  await prisma.user.create({
    data: {
      name: 'Kandy Shop User',
      email: 'shop2@retailims.com',
      passwordHash,
      roleId: shopRole.id,
      shopId: shop2.id,
      isActive: true,
    },
  });
  await prisma.user.create({
    data: {
      name: 'Inventory Manager',
      email: 'inventory@retailims.com',
      passwordHash,
      roleId: invRole.id,
      isActive: true,
    },
  });

  await prisma.systemSetting.create({
    data: {
      key: 'reorder_formula',
      value: { formula: 'FILL_TO_2X_MIN' },
    },
  });

  // Demo suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      supplierCode: 'SUP-DEMO1',
      supplierName: 'Central Wholesale',
      companyId: company1.id,
      categories: ['Grocery', 'Household'],
      rating: 4,
      contactPerson: 'Supplier Contact',
      email: 'sales@centralwholesale.example',
      phone: '+94770001122',
      paymentTerms: 'Net 30',
      isActive: true,
    },
  });

  await prisma.storageLocation.createMany({
    data: [
      { shopId: shop1.id, code: 'SL-01', name: 'Main Store', description: 'Raw materials', isActive: true },
      { shopId: shop1.id, code: 'SL-02', name: 'Finished Warehouse', description: 'Finished goods', isActive: true },
      { shopId: shop2.id, code: 'SL-01', name: 'Branch Store', description: 'General', isActive: true },
    ],
  });

  const categories = ['Beverages', 'Grocery', 'Household'];
  const productsData = [
    { code: 'TEA-001', desc: 'Black Tea 400g', shopId: shop1.id, cat: categories[0], opening: 120, min: 40, purchase: 450, sell: 620, reorder: 24 },
    { code: 'TEA-002', desc: 'Green Tea 200g', shopId: shop1.id, cat: categories[0], opening: 80, min: 30, purchase: 380, sell: 540, reorder: 20 },
    { code: 'RICE-01', desc: 'White Rice 5kg', shopId: shop1.id, cat: categories[1], opening: 200, min: 60, purchase: 1200, sell: 1550, reorder: 50 },
    { code: 'DAL-01', desc: 'Red Lentils 1kg', shopId: shop1.id, cat: categories[1], opening: 90, min: 25, purchase: 280, sell: 360, reorder: 15 },
    { code: 'OIL-01', desc: 'Coconut Oil 1L', shopId: shop1.id, cat: categories[1], opening: 55, min: 20, purchase: 520, sell: 690, reorder: 12 },
    { code: 'SOAP-01', desc: 'Laundry Soap Bar', shopId: shop1.id, cat: categories[2], opening: 150, min: 50, purchase: 120, sell: 180, reorder: 30 },
    { code: 'TEA-001', desc: 'Black Tea 400g', shopId: shop2.id, cat: categories[0], opening: 60, min: 25, purchase: 450, sell: 640, reorder: 20 },
    { code: 'RICE-01', desc: 'White Rice 5kg', shopId: shop2.id, cat: categories[1], opening: 40, min: 15, purchase: 1200, sell: 1580, reorder: 25 },
    { code: 'SUGAR-1', desc: 'White Sugar 1kg', shopId: shop2.id, cat: categories[1], opening: 100, min: 35, purchase: 180, sell: 240, reorder: 18 },
    { code: 'CLN-01', desc: 'Floor Cleaner 750ml', shopId: shop2.id, cat: categories[2], opening: 35, min: 12, purchase: 310, sell: 420, reorder: 10 },
  ];

  const products = [];
  for (const p of productsData) {
    const prod = await prisma.product.create({
      data: {
        productCode: p.code,
        description: p.desc,
        uom: 'UNIT',
        shopId: p.shopId,
        category: p.cat,
        purchasePrice: p.purchase,
        sellingPrice: p.sell,
        minStockLevel: p.min,
        openingStock: p.opening,
        reorderQty: p.reorder,
        isActive: true,
        createdById: admin.id,
      },
    });
    products.push(prod);
    if (Number(p.opening) > 0) {
      await prisma.stockLedger.create({
        data: {
          transactionType: TransactionType.OPENING,
          transactionRef: `OPENING-${prod.productCode}`,
          transactionDate: new Date(),
          inQty: new Prisma.Decimal(p.opening),
          outQty: new Prisma.Decimal(0),
          balanceQty: new Prisma.Decimal(p.opening),
          remarks: 'Seed opening',
          createdById: admin.id,
          shop: { connect: { id: prod.shopId } },
          product: { connect: { id: prod.id } },
        },
      });
    }
  }

  const postedGr = await prisma.goodsReceiptHeader.create({
    data: {
      grNumber: 'GR-202604-00001',
      grDate: new Date('2026-04-01'),
      shopId: shop1.id,
      supplierName: 'Seed Supplier',
      status: DocumentStatus.POSTED,
      postedAt: new Date(),
      totalValue: 0,
      createdById: admin.id,
    },
  });
  const grProd1 = products[0];
  const grProd2 = products[1];
  await prisma.goodsReceiptItem.createMany({
    data: [
      {
        grHeaderId: postedGr.id,
        productId: grProd1.id,
        quantity: 10,
        uom: 'UNIT',
        purchaseRate: 450,
        lineValue: 4500,
        createdById: admin.id,
      },
      {
        grHeaderId: postedGr.id,
        productId: grProd2.id,
        quantity: 5,
        uom: 'UNIT',
        purchaseRate: 380,
        lineValue: 1900,
        createdById: admin.id,
      },
    ],
  });
  await prisma.goodsReceiptHeader.update({
    where: { id: postedGr.id },
    data: { totalValue: 6400 },
  });
  await prisma.stockLedger.create({
    data: {
      transactionType: TransactionType.GOODS_RECEIPT,
      transactionRef: postedGr.grNumber,
      transactionDate: postedGr.grDate,
      inQty: new Prisma.Decimal(10),
      outQty: new Prisma.Decimal(0),
      balanceQty: new Prisma.Decimal(0),
      unitRate: 450,
      value: 4500,
      createdById: admin.id,
      shop: { connect: { id: shop1.id } },
      product: { connect: { id: grProd1.id } },
    },
  });
  await prisma.stockLedger.create({
    data: {
      transactionType: TransactionType.GOODS_RECEIPT,
      transactionRef: postedGr.grNumber,
      transactionDate: postedGr.grDate,
      inQty: new Prisma.Decimal(5),
      outQty: new Prisma.Decimal(0),
      balanceQty: new Prisma.Decimal(0),
      unitRate: 380,
      value: 1900,
      createdById: admin.id,
      shop: { connect: { id: shop1.id } },
      product: { connect: { id: grProd2.id } },
    },
  });

  await prisma.goodsReceiptHeader.create({
    data: {
      grNumber: 'GR-202604-00002',
      grDate: new Date('2026-04-05'),
      shopId: shop1.id,
      supplierName: 'Draft Supplier',
      status: DocumentStatus.DRAFT,
      createdById: admin.id,
      items: {
        create: [
          {
            productId: products[2].id,
            quantity: 2,
            uom: 'UNIT',
            purchaseRate: 1200,
            lineValue: 2400,
            createdById: admin.id,
          },
        ],
      },
    },
  });

  const gi = await prisma.goodsIssueHeader.create({
    data: {
      giNumber: 'GI-202604-00001',
      giDate: new Date('2026-04-06'),
      shopId: shop1.id,
      issueReason: 'Retail sales',
      status: DocumentStatus.POSTED,
      postedAt: new Date(),
      createdById: admin.id,
    },
  });
  await prisma.goodsIssueItem.create({
    data: {
      giHeaderId: gi.id,
      productId: grProd1.id,
      quantity: 5,
      uom: 'UNIT',
      availableStockSnapshot: 130,
      createdById: admin.id,
    },
  });
  await prisma.stockLedger.create({
    data: {
      transactionType: TransactionType.GOODS_ISSUE,
      transactionRef: gi.giNumber,
      transactionDate: gi.giDate,
      inQty: new Prisma.Decimal(0),
      outQty: new Prisma.Decimal(5),
      balanceQty: new Prisma.Decimal(0),
      createdById: admin.id,
      shop: { connect: { id: shop1.id } },
      product: { connect: { id: grProd1.id } },
    },
  });

  const dm = await prisma.damagedStock.create({
    data: {
      damageNumber: 'DM-202604-00001',
      damageDate: new Date('2026-04-07'),
      shopId: shop1.id,
      productId: products[2].id,
      damagedQuantity: 2,
      reason: 'Water damage',
      status: DocumentStatus.POSTED,
      postedAt: new Date(),
      createdById: admin.id,
    },
  });
  await prisma.stockLedger.create({
    data: {
      transactionType: TransactionType.DAMAGE,
      transactionRef: dm.damageNumber,
      transactionDate: dm.damageDate,
      inQty: new Prisma.Decimal(0),
      outQty: new Prisma.Decimal(2),
      balanceQty: new Prisma.Decimal(0),
      createdById: admin.id,
      shop: { connect: { id: shop1.id } },
      product: { connect: { id: products[2].id } },
    },
  });

  const lowProd = products.find((p) => p.shopId === shop2.id && p.productCode === 'CLN-01');
  if (lowProd) {
    await prisma.purchaseOrderHeader.create({
      data: {
        poNumber: 'PO-202604-00001',
        poDate: new Date('2026-04-08'),
        shopId: shop2.id,
        supplier: 'Central Wholesale',
        status: PurchaseOrderStatus.DRAFT,
        totalValue: 420 * 20,
        createdById: admin.id,
        items: {
          create: [
            {
              productId: lowProd.id,
              currentStock: 35,
              minStock: 12,
              suggestedQty: 20,
              orderQty: 20,
              rate: 420,
              lineValue: 8400,
              createdById: admin.id,
            },
          ],
        },
      },
    });
  }

  await prisma.documentSequence.createMany({
    data: [
      { docType: 'GR', shopId: shop1.id, yearMonth: '202604', lastSeq: 2 },
      { docType: 'GI', shopId: shop1.id, yearMonth: '202604', lastSeq: 1 },
      { docType: 'DM', shopId: shop1.id, yearMonth: '202604', lastSeq: 1 },
      { docType: 'PO', shopId: shop2.id, yearMonth: '202604', lastSeq: 1 },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
