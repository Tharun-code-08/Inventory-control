import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service';
import { splitAddressLines } from '../document-pdf.formatters';

export type ShopCompanyContext = {
  companyId: string;
  companyName: string;
  companyLines: string[];
  shopName: string;
  shopLines: string[];
  shopEmail?: string | null;
  shopGstin?: string | null;
};

export async function loadShopCompanyContext(
  prisma: PrismaService,
  shopId: string,
): Promise<ShopCompanyContext> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      shopName: true,
      address: true,
      email: true,
      taxId: true,
      companyId: true,
      company: { select: { companyName: true, address: true } },
    },
  });
  if (!shop?.companyId) {
    throw new BadRequestException('Shop not linked to a company');
  }

  const companyName = shop.company?.companyName ?? shop.shopName ?? 'Company';
  const companyLines = buildCompanyPartyLines({
    address: shop.company?.address ?? shop.address,
    gstin: shop.taxId,
    email: shop.email,
  });

  return {
    companyId: shop.companyId,
    companyName,
    companyLines,
    shopName: shop.shopName,
    shopLines: splitAddressLines(shop.address),
    shopEmail: shop.email,
    shopGstin: shop.taxId,
  };
}

export function buildCompanyPartyLines(args: {
  address?: string | null;
  gstin?: string | null;
  email?: string | null;
}): string[] {
  const lines = splitAddressLines(args.address);
  if (args.gstin?.trim()) lines.push(`GSTIN: ${args.gstin.trim()}`);
  if (args.email?.trim()) lines.push(`Email: ${args.email.trim()}`);
  return lines;
}

export function customerPartyLines(customer: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  pan?: string | null;
}): string[] {
  const cityLine = [customer.city, customer.state, customer.postalCode, customer.country]
    .filter(Boolean)
    .join(', ');
  return [
    customer.street ?? '',
    cityLine,
    customer.phone ? `Tel: ${customer.phone}` : '',
    customer.email ?? '',
    customer.taxId ? `GSTIN: ${customer.taxId}` : '',
    customer.pan ? `PAN: ${customer.pan}` : '',
  ].filter(Boolean);
}

export function supplierPartyLines(supplier: {
  contactPerson?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  vatNumber?: string | null;
}): string[] {
  const cityLine = [supplier.city, supplier.state, supplier.postalCode, supplier.country]
    .filter(Boolean)
    .join(', ');
  return [
    supplier.contactPerson ?? '',
    supplier.street ?? '',
    cityLine,
    supplier.phone ? `Tel: ${supplier.phone}` : '',
    supplier.email ?? '',
    supplier.taxId ? `Tax ID: ${supplier.taxId}` : '',
    supplier.vatNumber ? `VAT: ${supplier.vatNumber}` : '',
  ].filter(Boolean);
}
