import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type SupplierReturnReasonCode = 'DAMAGED' | 'WRONG_ITEM' | 'EXPIRED' | 'EXCESS';
export type SupplierReturnStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'DONE'
  | 'CANCELLED'
  | 'POSTED';

export type SupplierReturnImage = {
  id: string;
  returnId: string;
  returnItemId?: string | null;
  publicUrl: string;
  originalFilename: string;
  mimeType: string;
  filePath?: string;
};

export type SupplierReturnItem = {
  id: string;
  goodsReceiptItemId?: string | null;
  productId: string;
  quantity: string | number;
  grnQuantity?: string | number | null;
  uom: string;
  unitCost: string | number;
  lineValue: string | number;
  reasonCode?: SupplierReturnReasonCode | null;
  product?: {
    id: string;
    productCode?: string;
    description?: string;
  } | null;
  goodsReceiptItem?: {
    id: string;
    quantity: string | number;
    uom: string;
    product?: {
      id: string;
      productCode?: string;
      description?: string;
    } | null;
  } | null;
  images: SupplierReturnImage[];
};

export type SupplierReturn = {
  id: string;
  returnNumber: string;
  returnDate: string;
  shopId: string;
  supplierName: string;
  supplierId?: string | null;
  purchaseOrderId?: string | null;
  goodsReceiptId?: string | null;
  supplierRef?: string | null;
  remarks?: string | null;
  internalCcEmail?: string | null;
  status: SupplierReturnStatus;
  totalValue: string | number;
  submittedAt?: string | null;
  acknowledgedAt?: string | null;
  emailSentAt?: string | null;
  postedAt?: string | null;
  supplier?: {
    id: string;
    supplierName: string;
    email?: string | null;
  } | null;
  goodsReceipt?: {
    id: string;
    grNumber: string;
    grDate: string;
    supplierName: string;
  } | null;
  shop?: {
    id: string;
    shopName: string;
    shopNumber?: string;
  } | null;
  images: SupplierReturnImage[];
  items: SupplierReturnItem[];
};

export type CreateSupplierReturnPayload = {
  goodsReceiptId: string;
  returnDate?: string;
  supplierRef?: string;
  remarks?: string;
  internalCcEmail?: string;
  items: Array<{
    goodsReceiptItemId: string;
    returnQty: number;
    reasonCode: SupplierReturnReasonCode;
  }>;
};

const keys = {
  all: ['returns'] as const,
  supplierList: () => [...keys.all, 'supplier-list'] as const,
  supplierDetail: (id: string) => [...keys.all, 'supplier-detail', id] as const,
};

export function useSupplierReturns() {
  return useQuery({
    queryKey: keys.supplierList(),
    queryFn: async () => {
      const res = await api.get('/returns/supplier');
      return (res.data.data ?? []) as SupplierReturn[];
    },
  });
}

export function useSupplierReturn(id: string) {
  return useQuery({
    queryKey: keys.supplierDetail(id),
    queryFn: async () => {
      const res = await api.get(`/returns/supplier/${id}`);
      return res.data.data as SupplierReturn;
    },
    enabled: Boolean(id),
  });
}

export function useCreateSupplierReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplierReturnPayload) => {
      const res = await api.post('/returns/supplier', payload);
      return res.data.data as SupplierReturn;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateSupplierReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<CreateSupplierReturnPayload>;
    }) => {
      const res = await api.patch(`/returns/supplier/${id}`, payload);
      return res.data.data as SupplierReturn;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: keys.supplierDetail(variables.id) });
    },
  });
}

export function useUploadSupplierReturnImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      file,
      returnItemId,
    }: {
      id: string;
      file: File;
      returnItemId?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (returnItemId) formData.append('returnItemId', returnItemId);
      const res = await api.post(`/returns/supplier/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as SupplierReturnImage;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: keys.supplierDetail(variables.id) });
    },
  });
}

export function useDeleteSupplierReturnImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, imageId }: { id: string; imageId: string }) => {
      const res = await api.delete(`/returns/supplier/${id}/images/${imageId}`);
      return res.data.data as { deleted: boolean; id: string };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: keys.supplierDetail(variables.id) });
    },
  });
}

export function useSubmitSupplierReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/returns/supplier/${id}/submit`);
      return res.data.data as SupplierReturn;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: keys.supplierDetail(id) });
    },
  });
}

export function useCancelSupplierReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/returns/supplier/${id}/cancel`);
      return res.data.data as SupplierReturn;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: keys.supplierDetail(id) });
    },
  });
}
