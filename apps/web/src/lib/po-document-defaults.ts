import type { Company } from '@/hooks/use-companies';
import type { PurchaseOrder } from '@/hooks/use-purchase-orders';
import type { Shop } from '@/hooks/use-shops';
import type { Supplier } from '@/hooks/use-suppliers';
import { mergePoDocument, parsePoRemarks, type PoDocumentMeta } from '@/lib/po-document';

export function defaultBuyerFromCompany(company?: Company | null): PoDocumentMeta {
  if (!company) return {};
  return {
    buyerCompanyName: company.companyName,
    buyerAddress: company.address ?? undefined,
  };
}

export function defaultVendorFromSupplier(
  supplierName: string,
  supplier?: Supplier | null,
): PoDocumentMeta {
  if (!supplier) {
    return { vendorCompanyName: supplierName };
  }
  const cityLine = [supplier.city, supplier.state, supplier.postalCode, supplier.country]
    .filter(Boolean)
    .join(', ');
  return {
    vendorCompanyName: supplier.supplierName,
    vendorContact: supplier.contactPerson ?? undefined,
    vendorAddress: supplier.street ?? undefined,
    vendorCityStateZip: cityLine || undefined,
    vendorPhone: supplier.phone ?? undefined,
    paymentTerms: supplier.paymentTerms ?? undefined,
    contactName: supplier.contactPerson ?? undefined,
    contactPhone: supplier.phone ?? undefined,
    contactEmail: supplier.email ?? undefined,
  };
}

/** Delivery address for PO forms — uses the plant (shop) address as the ship-to location. */
export function resolvePoDeliveryAddress(shop?: Shop | null): string {
  return shop?.address?.trim() ?? '';
}

export function defaultShipToFromShop(shop?: Shop | null, deliveryAddress?: string): PoDocumentMeta {
  if (!shop) return { shipToAddress: deliveryAddress };
  const shipToAddress = deliveryAddress?.trim() || resolvePoDeliveryAddress(shop);
  return {
    shipToName: shop.contactPerson,
    shipToCompany: shop.shopName,
    shipToAddress,
    shipToPhone: shop.mobile,
    contactName: shop.contactPerson,
    contactPhone: shop.mobile,
    contactEmail: shop.email,
  };
}

export function resolvePoDocumentForPdf(args: {
  po: PurchaseOrder;
  company?: Company | null;
  supplier?: Supplier | null;
  shop?: Shop | null;
}): PoDocumentMeta {
  const { po, company, supplier, shop } = args;
  const { document: embedded } = parsePoRemarks(po.remarks);
  const plant = shop ?? (po.shop as Shop | undefined);
  const shipTo = defaultShipToFromShop(plant);
  const merged = mergePoDocument(
    defaultBuyerFromCompany(company),
    defaultVendorFromSupplier(po.supplier, supplier),
    embedded,
    shipTo,
  );
  // Delivery address on the PDF always reflects the PO plant, not a stale manual override.
  return {
    ...merged,
    shipToCompany: shipTo.shipToCompany ?? merged.shipToCompany,
    shipToAddress: shipTo.shipToAddress ?? merged.shipToAddress,
    shipToPhone: shipTo.shipToPhone ?? merged.shipToPhone,
    shipToName: shipTo.shipToName ?? merged.shipToName,
  };
}

export function buildInitialPoDocument(args: {
  company?: Company | null;
  shop?: Shop | null;
  supplier?: Supplier | null;
  supplierName?: string;
  deliveryAddress?: string;
  paymentTerms?: string;
}): PoDocumentMeta {
  return mergePoDocument(
    defaultBuyerFromCompany(args.company),
    defaultVendorFromSupplier(args.supplierName ?? args.supplier?.supplierName ?? '', args.supplier),
    defaultShipToFromShop(args.shop, args.deliveryAddress),
    { paymentTerms: args.paymentTerms },
  );
}
