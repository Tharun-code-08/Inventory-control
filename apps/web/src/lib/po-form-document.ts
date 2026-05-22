import type { Shop } from '@/hooks/use-shops';
import { encodePoRemarks, type PoDocumentMeta } from '@/lib/po-document';
import { defaultShipToFromShop } from '@/lib/po-document-defaults';

export type PoLogisticsTaxForm = {
  remarks?: string;
  deliveryAddress?: string;
  requisitioner?: string;
  requisitionerPreset?: string;
  shipVia?: string;
  fob?: string;
  shippingTerms?: string;
  taxPercent?: number | string;
  cgstPercent?: number | string;
  sgstPercent?: number | string;
};

function num(value: number | string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function documentFromPoForm(values: PoLogisticsTaxForm, shop?: Shop | null): PoDocumentMeta {
  const taxPercent = num(values.taxPercent);
  let cgstPercent = num(values.cgstPercent);
  let sgstPercent = num(values.sgstPercent);
  if (taxPercent > 0 && cgstPercent === 0 && sgstPercent === 0) {
    cgstPercent = taxPercent / 2;
    sgstPercent = taxPercent / 2;
  }

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

  return {
    requisitioner: requisitioner || undefined,
    shipVia: values.shipVia || undefined,
    fob: values.fob || undefined,
    shippingTerms: values.shippingTerms || undefined,
    taxPercent: taxPercent || undefined,
    cgstPercent: cgstPercent || undefined,
    sgstPercent: sgstPercent || undefined,
    ...defaultShipToFromShop(shop, values.deliveryAddress),
  };
}

export function encodePoFormRemarks(values: PoLogisticsTaxForm, shop?: Shop | null): string {
  return encodePoRemarks(values.remarks ?? '', documentFromPoForm(values, shop));
}

export function computeGstAmounts(subtotal: number, doc: PoDocumentMeta) {
  const cgstPct = num(doc.cgstPercent);
  const sgstPct = num(doc.sgstPercent);
  const taxPct = num(doc.taxPercent);
  let cgst = subtotal * (cgstPct / 100);
  let sgst = subtotal * (sgstPct / 100);
  if (taxPct > 0 && cgst === 0 && sgst === 0) {
    cgst = subtotal * (taxPct / 200);
    sgst = subtotal * (taxPct / 200);
  }
  return { cgst, sgst, totalTax: cgst + sgst };
}
