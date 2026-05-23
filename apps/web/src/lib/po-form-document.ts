import type { Shop } from '@/hooks/use-shops';
import { encodePoRemarks, type PoDocumentMeta } from '@/lib/po-document';
import { defaultShipToFromShop } from '@/lib/po-document-defaults';
import { numPo } from '@/lib/po-line-calculations';

export type PoLogisticsForm = {
  remarks?: string;
  deliveryAddress?: string;
  requisitioner?: string;
  requisitionerPreset?: string;
  shipVia?: string;
  fob?: string;
  shippingTerms?: string;
  items?: Array<{ productId: string; taxPercent?: number | string }>;
};

export function documentFromPoForm(values: PoLogisticsForm, shop?: Shop | null): PoDocumentMeta {
  let requisitioner = values.requisitioner?.trim() ?? '';
  if (values.requisitionerPreset === 'auto' && !requisitioner) {
    requisitioner = 'Current user';
  } else if (
    values.requisitionerPreset &&
    values.requisitionerPreset !== '__custom__' &&
    values.requisitionerPreset !== 'auto'
  ) {
    requisitioner = values.requisitionerPreset;
  }

  const lineItemTaxes = (values.items ?? [])
    .filter((it) => it.productId)
    .map((it) => ({
      productId: it.productId,
      taxPercent: Math.max(0, numPo(it.taxPercent)),
    }));

  return {
    requisitioner: requisitioner || undefined,
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
