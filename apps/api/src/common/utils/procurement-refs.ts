import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * Suppliers must belong to the plant's company and an RFQ to the plant itself;
 * otherwise a document could link (and echo back) another tenant's records.
 */
export async function assertProcurementRefs(
  prisma: PrismaService,
  shopId: string,
  refs: { supplierIds?: Array<string | null | undefined>; rfqId?: string | null },
): Promise<void> {
  const supplierIds = [...new Set((refs.supplierIds ?? []).filter((id): id is string => !!id))];
  if (supplierIds.length === 0 && !refs.rfqId) return;

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { companyId: true } });
  if (supplierIds.length > 0) {
    const ok = await prisma.supplier.count({
      where: { id: { in: supplierIds }, companyId: shop?.companyId ?? '__none__' },
    });
    if (ok !== supplierIds.length) {
      throw new BadRequestException('Supplier does not belong to your organisation');
    }
  }
  if (refs.rfqId) {
    const rfq = await prisma.rfqHeader.findUnique({ where: { id: refs.rfqId }, select: { shopId: true } });
    if (!rfq || rfq.shopId !== shopId) {
      throw new BadRequestException('RFQ does not belong to the selected plant');
    }
  }
}
