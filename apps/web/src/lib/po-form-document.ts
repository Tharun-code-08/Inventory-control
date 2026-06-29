import type { Shop } from '@/hooks/use-shops';
import { encodePoRemarks, type PoDocumentMeta } from '@/lib/po-document';
import { defaultShipToFromShop } from '@/lib/po-document-defaults';
import { numPo } from '@/lib/po-line-calculations';

export type PoLogisticsForm = {
  remarks?: string;
  deliveryAddress?: string;
  paymentTerms?: string;
  requisitioner?: string;
  department?: string;
  /** @deprecated Legacy create-PO preset; mapped to department when department is empty. */
  requisitionerPreset?: string;
  shipVia?: string;
  fob?: string;
  shippingTerms?: string;
  items?: Array<{ productId?: string; taxPercent?: number | string }>;
};

function resolveDepartment(values: PoLogisticsForm): string | undefined {
  const explicit = values.department?.trim();
  if (explicit) return explicit;
  const preset = values.requisitionerPreset?.trim();
  if (preset && preset !== '__custom__' && preset !== 'auto') return preset;
  return undefined;
}

function resolveRequestedBy(values: PoLogisticsForm): string | undefined {
  let name = values.requisitioner?.trim() ?? '';
  if (!name && values.requisitionerPreset === 'auto') {
    name = 'Current user';
  }
  return name || undefined;
}

export function documentFromPoForm(values: PoLogisticsForm, shop?: Shop | null): PoDocumentMeta {
  const lineItemTaxes = (values.items ?? [])
    .filter((it): it is typeof it & { productId: string } => Boolean(it.productId))
    .map((it) => ({
      productId: it.productId,
      taxPercent: Math.max(0, numPo(it.taxPercent)),
    }));

  return {
    requisitioner: resolveRequestedBy(values),
    department: resolveDepartment(values),
    paymentTerms: values.paymentTerms?.trim() || undefined,
    shipVia: values.shipVia || undefined,
    fob: values.fob || undefined,
    shippingTerms: values.shippingTerms || undefined,
    lineItemTaxes: lineItemTaxes.length ? lineItemTaxes : undefined,
    ...defaultShipToFromShop(shop, values.deliveryAddress),
  };
}

export function encodePoFormRemarks(values: PoLogisticsForm, shop?: Shop | null): string {
  return encodePoRemarks(values.remarks ?? '', documentFromPoForm(values, shop));
}

/** @deprecated Use per-line tax via lineItemTaxes. Kept for legacy PDF totals. */
export function computeGstAmounts(subtotal: number, doc: PoDocumentMeta) {
  const cgstPct = numPo(doc.cgstPercent);
  const sgstPct = numPo(doc.sgstPercent);
  const taxPct = numPo(doc.taxPercent);
  let cgst = subtotal * (cgstPct / 100);
  let sgst = subtotal * (sgstPct / 100);
  if (taxPct > 0 && cgst === 0 && sgst === 0) {
    cgst = subtotal * (taxPct / 200);
    sgst = subtotal * (taxPct / 200);
  }
  return { cgst, sgst, totalTax: cgst + sgst };
}
