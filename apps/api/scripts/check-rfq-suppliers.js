require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
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
