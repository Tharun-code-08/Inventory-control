require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.rfqHeader
  .findMany({
    include: { suppliers: { include: { supplier: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  .then((rows) => {
    for (const r of rows) {
      console.log(
        r.rfqNumber,
        r.status,
        r.suppliers.map((s) => ({
          name: s.supplier?.supplierName,
          email: s.supplier?.email,
        })),
      );
    }
  })
  .finally(() => p.$disconnect());
