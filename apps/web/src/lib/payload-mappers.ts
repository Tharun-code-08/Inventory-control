import type { CreatePurchaseOrderPayload } from '@/hooks/use-purchase-orders';
import type { Shop } from '@/hooks/use-shops';
import { encodePoFormRemarks, type PoLogisticsForm } from '@/lib/po-form-document';
import type { CreateProductPayload, TaxPreference, UpdateProductPayload } from '@/hooks/use-products';
import type { CreateUserPayload, UpdateUserPayload } from '@/hooks/use-users';

function devAssert(condition: unknown, message: string): asserts condition {
  if (import.meta.env.DEV && !condition) {
    throw new Error(message);
  }
}

type PoFormItem = {
  productId?: string;
  rfqItemId?: string;
  lineDescription?: string;
  lineCategory?: string;
  orderQty: number;
  rate: number;
  taxPercent?: number | string;
};

// Omit the loose `items` from PoLogisticsForm so the richer PoFormItem[] wins
// instead of being intersected down to the logistics doc's narrow item shape.
type PoFormValues = Omit<PoLogisticsForm, 'items'> & {
  poDate: string;
  supplier: string;
  useManualPoNumber?: boolean;
  poNumberManual?: string;
  items: PoFormItem[];
};

export function mapPoFormToCreatePayload(args: {
  values: PoFormValues;
  resolvedShopId: string;
  shop?: Shop | null;
  sourceType: 'DIRECT' | 'RFQ' | 'CONTRACT';
  sourceContractId?: string;
  sourceRfqId?: string;
}): CreatePurchaseOrderPayload {
  const { values, resolvedShopId, shop, sourceType, sourceContractId, sourceRfqId } = args;
  devAssert(Boolean(resolvedShopId), 'Purchase order requires a shop');
  devAssert(values.items.length > 0, 'Purchase order requires at least one item');

  return {
    shopId: resolvedShopId,
    poDate: values.poDate,
    poNumber: values.useManualPoNumber ? values.poNumberManual?.trim() || undefined : undefined,
    supplier: values.supplier,
    contractId: sourceType === 'CONTRACT' ? sourceContractId : undefined,
    rfqId: sourceType === 'RFQ' ? sourceRfqId : undefined,
    remarks: encodePoFormRemarks(values, shop),
    items: values.items.map((it) => {
      const hasProduct = Boolean(it.productId?.trim());
      const hasDescription = Boolean(it.lineDescription?.trim());
      devAssert(hasProduct || hasDescription, 'Purchase order item requires a product or description');
      devAssert(it.orderQty > 0, 'Purchase order qty must be > 0');
      devAssert(it.rate > 0, 'Purchase order rate must be > 0');
      return {
        productId: hasProduct ? it.productId!.trim() : undefined,
        rfqItemId: it.rfqItemId,
        lineDescription: it.lineDescription?.trim() || undefined,
        lineCategory: it.lineCategory?.trim() || (hasDescription && !hasProduct ? 'Service' : undefined),
        orderQty: it.orderQty,
        rate: it.rate,
      };
    }),
  };
}

export type ProductFormPlant = {
  shopId: string;
  storageLocationId?: string;
  openingStock: number;
  batchNumber?: string;
  expiryDate?: string;
  minStockLevel: number;
  maxStockLevel?: number | null;
  reorderQty?: number | null;
  isActive?: boolean;
};

export type ProductFormSpecification = {
  label: string;
  value: string;
};

export type ProductFormValues = {
  productCode: string;
  description: string;
  category: string;
  hsnCode?: string;
  materialGroup?: string;
  drawingReference?: string;
  brand?: string;
  taxPreference?: TaxPreference;
  gstRate?: number;
  purchasePrice: number;
  sellingPrice: number;
  uom: string;
  isActive: boolean;
  plants: ProductFormPlant[];
  specifications: ProductFormSpecification[];
};

export function mapProductFormToPayload(args: {
  values: ProductFormValues;
  finalProductCode: string;
  mode: 'create';
}): CreateProductPayload;
export function mapProductFormToPayload(args: {
  values: ProductFormValues;
  finalProductCode: string;
  mode: 'update';
}): UpdateProductPayload;
export function mapProductFormToPayload(args: {
  values: ProductFormValues;
  finalProductCode: string;
  mode: 'create' | 'update';
}): CreateProductPayload | UpdateProductPayload {
  const { values, finalProductCode, mode } = args;
  devAssert(Boolean(finalProductCode), 'Product code is required');
  devAssert(values.plants.length > 0, 'Product requires at least one plant assignment');

  const base: CreateProductPayload = {
    productCode: finalProductCode,
    description: values.description,
    uom: values.uom,
    category: values.category,
    hsnCode: values.hsnCode?.trim() ? values.hsnCode.trim() : undefined,
    materialGroup: values.materialGroup?.trim() ? values.materialGroup.trim() : undefined,
    drawingReference: values.drawingReference?.trim() ? values.drawingReference.trim() : undefined,
    brand: values.brand?.trim() ? values.brand.trim() : undefined,
    taxPreference: values.taxPreference ?? 'TAXABLE',
    gstRate: values.gstRate ?? 0,
    purchasePrice: values.purchasePrice,
    sellingPrice: values.sellingPrice,
    isActive: values.isActive,
    plants: values.plants.map((plant) => {
      devAssert(Boolean(plant.shopId), 'Plant assignment requires a shop');
      return {
        shopId: plant.shopId,
        storageLocationId: plant.storageLocationId?.trim() ? plant.storageLocationId : undefined,
        openingStock: Number(plant.openingStock ?? 0),
        batchNumber: plant.batchNumber?.trim() ? plant.batchNumber.trim() : undefined,
        expiryDate: plant.expiryDate?.trim() ? plant.expiryDate.trim() : undefined,
        minStockLevel: Number(plant.minStockLevel ?? 0),
        maxStockLevel:
          plant.maxStockLevel == null || plant.maxStockLevel === undefined
            ? undefined
            : Number(plant.maxStockLevel),
        reorderQty:
          plant.reorderQty == null || plant.reorderQty === undefined
            ? undefined
            : Number(plant.reorderQty),
        isActive: plant.isActive ?? true,
      };
    }),
    specifications: values.specifications
      .filter((spec) => spec.label.trim() && spec.value.trim())
      .map((spec) => ({ label: spec.label.trim(), value: spec.value.trim() })),
  };

  if (mode === 'create') return base;
  return base as UpdateProductPayload;
}

type UserFormValues = {
  name: string;
  email: string;
  password?: string;
  roleId: string;
  isActive: boolean;
};

export function mapUserFormToCreatePayload(args: {
  values: UserFormValues;
  resolvedShopId: string | null;
}): CreateUserPayload {
  const { values, resolvedShopId } = args;
  devAssert(Boolean(values.email), 'User email is required');
  devAssert(Boolean(values.password), 'User password is required');
  return {
    name: values.name,
    email: values.email,
    password: values.password ?? '',
    roleId: values.roleId,
    shopId: resolvedShopId,
    isActive: values.isActive,
  };
}

export function mapUserFormToUpdatePayload(args: {
  id: string;
  values: UserFormValues;
  resolvedShopId: string | null;
}): UpdateUserPayload & { id: string } {
  const { id, values, resolvedShopId } = args;
  const payload: UpdateUserPayload & { id: string } = {
    id,
    name: values.name,
    roleId: values.roleId,
    shopId: resolvedShopId,
    isActive: values.isActive,
  };
  if (values.password) payload.password = values.password;
  return payload;
}
