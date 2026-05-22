require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const r = await p.rfqHeader.findFirst({
    where: { rfqNumber: 'RFQ-BMW001-202605-00002' },
  });
  if (!r) {
    console.log('RFQ not found');
    return;
  }
  const q = await p.supplierQuotationHeader.count({ where: { rfqId: r.id } });
  const c = await p.contractHeader.count({ where: { rfqId: r.id } });
  console.log({ id: r.id, status: r.status, quotations: q, contracts: c });
}

main()
  .catch((e) => console.error(e))
  .finally(() => p.$disconnect());
