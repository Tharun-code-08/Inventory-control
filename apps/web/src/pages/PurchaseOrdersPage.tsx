import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  Eye,
  Pencil,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  ArrowRightFromLine,
  ClipboardList,
  Send,
  Download,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader, SearchInput, ConfirmDialog, DataTablePagination, LoadingSkeleton, EmptyState, AnimatedTableBody, P2PFlowTimeline, CreatePageLayout, FormSection, FormGrid, type P2PStep } from '@/components/shared';
import { DocumentEmailHistoryPanel } from '@/components/shared/DocumentEmailHistoryPanel';
import { useDocumentEmailHistory } from '@/hooks/use-document-email-history';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

import {
  usePurchaseOrders,
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useConfirmPurchaseOrder,
  useCancelPurchaseOrder,
  useSendPurchaseOrder,
  poKeys,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@/hooks/use-purchase-orders';
import { useProducts, type Product } from '@/hooks/use-products';
import { useRfqs } from '@/hooks/use-rfqs';
import { useContracts } from '@/hooks/use-contracts';
import { useSuppliers, useCreateSupplier } from '@/hooks/use-suppliers';
import { useCompanies } from '@/hooks/use-companies';
import { useShops } from '@/hooks/use-shops';
import { useStorageLocations } from '@/hooks/use-storage-locations';
import { mapPoFormToCreatePayload } from '@/lib/payload-mappers';
import { hasAnyPermission, hasPermission } from '@/lib/permissions';
import { parsePoRemarks } from '@/lib/po-document';
import { resolvePoDeliveryAddress, resolvePoDocumentForPdf } from '@/lib/po-document-defaults';
import { downloadDocumentPdf } from '@/lib/document-pdf';
import { DEPARTMENT_OPTIONS } from '@/lib/po-form-options';
import { PoLogisticsTaxFields } from '@/components/purchase-orders/PoLogisticsTaxFields';
import type { PoDocumentMeta } from '@/lib/po-document';
import { computeGstAmounts } from '@/lib/po-form-document';
import {
  computePoLineAmounts,
  numPo,
  sumPoLineTotals,
  taxPercentForProduct,
} from '@/lib/po-line-calculations';
import { csvDate, csvMoney, exportModuleCsv } from '@/lib/module-csv';
import { getApiErrorMessage } from '@/lib/api-error';
import { useSupplierBills } from '@/hooks/use-supplier-bills';
import { resolvePreferredOrgId, syncPreferredOrgId } from '@/lib/cookie-consent';
import { useCookieConsentStore } from '@/store/cookieConsentStore';

/** Roles that must use their assigned plant and cannot switch delivery plant. */
const SHOP_SCOPED_ROLES = new Set(['SHOP_USER', 'WAREHOUSE_STAFF', 'VIEWER', 'VENDOR']);

function isShopScopedRole(role?: string | null): boolean {
  return !!role && SHOP_SCOPED_ROLES.has(role);
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const poItemSchema = z
  .object({
    productId: z.string().optional(),
    rfqItemId: z.string().optional(),
    lineDescription: z.string().optional(),
    lineCategory: z.string().optional(),
    currentStock: z.coerce.number().min(0),
    minStock: z.coerce.number().min(0),
    suggestedQty: z.coerce.number().min(0),
    orderQty: z.coerce.number().positive('Order qty must be > 0'),
    rate: z.coerce.number().positive('Rate must be > 0'),
    taxPercent: z.coerce.number().min(0).max(100).optional(),
  })
  .superRefine((line, ctx) => {
    const hasProduct = Boolean(line.productId?.trim());
    const hasDescription = Boolean(line.lineDescription?.trim());
    if (!hasProduct && !hasDescription) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a product or enter a description',
        path: ['lineDescription'],
      });
    }
  });

const poFormSchema = z.object({
  poDate: z
    .string()
    .min(1, 'Date is required')
    .refine((value) => value <= todayDateString(), {
      message: 'PO date cannot be in the future',
    }),
  priority: z.string().optional(),
  paymentTerms: z.string().optional(),
  supplier: z.string().min(1, 'Supplier is required'),
  deliveryPlantId: z.string().min(1, 'Delivery plant is required'),
  storageLocationId: z.string().optional(),
  deliveryAddress: z.string().optional(),
  remarks: z.string().optional(),
  requisitioner: z.string().optional(),
  department: z.string().optional(),
  shipVia: z.string().optional(),
  fob: z.string().optional(),
  shippingTerms: z.string().optional(),
  useManualPoNumber: z.boolean().optional(),
  poNumberManual: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'Add at least one item'),
});

type POFormValues = z.infer<typeof poFormSchema>;

const PAGE_SIZE = 10;
const CREATE_SUPPLIER_OPTION = '__create_supplier__';
/** Compact listboxes in the PO create sheet */
const PO_SELECT_TRIGGER = 'h-8 min-h-8 py-1 px-2 text-xs';
const PO_SELECT_CONTENT = 'max-h-52 text-xs';

function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Multi-plant: a Product can be assigned to several plants. The PO form is
 * scoped to a single delivery plant, so stock thresholds (`minStockLevel`)
 * come from the plant-specific assignment, not the product master.
 */
function getProductPlant(product: Product, shopId: string) {
  return product.plants.find((p) => p.shopId === shopId);
}

function defaultPoLogisticsFields(userName?: string) {
  return {
    requisitioner: userName ?? '',
    department: '',
    shipVia: '',
    fob: '',
    shippingTerms: '',
  };
}

function logisticsFieldsFromDocument(doc: PoDocumentMeta) {
  return {
    requisitioner: doc.requisitioner ?? '',
    department: doc.department ?? '',
    shipVia: doc.shipVia ?? '',
    fob: doc.fob ?? '',
    shippingTerms: doc.shippingTerms ?? '',
  };
}

function logisticsFieldsFromDocumentWithPayment(doc: PoDocumentMeta, paymentTerms?: string) {
  return {
    ...logisticsFieldsFromDocument(doc),
    paymentTerms: doc.paymentTerms ?? paymentTerms ?? '',
  };
}

function defaultPoLineItem() {
  return {
    productId: '',
    rfqItemId: undefined as string | undefined,
    lineDescription: '',
    lineCategory: '',
    currentStock: 0,
    minStock: 0,
    suggestedQty: 0,
    orderQty: 1,
    rate: 0,
    taxPercent: '' as string | number,
  };
}

function taxPercentFromDocument(doc: PoDocumentMeta, productId: string): string | number {
  const pct = taxPercentForProduct(doc.lineItemTaxes, productId);
  return pct > 0 ? pct : '';
}

function effectivePoLineTaxPercent(
  productId: string,
  taxPercent: number | string | undefined,
  productLookup?: ReadonlyMap<string, Product>,
): number {
  const product = productLookup?.get(productId);
  if (product?.taxPreference === 'NON_TAXABLE') {
    return 0;
  }
  return Math.max(0, numPo(taxPercent));
}

function sanitizePoDocumentTaxes(
  document: PoDocumentMeta,
  productLookup?: ReadonlyMap<string, Product>,
): PoDocumentMeta {
  if (!document.lineItemTaxes?.length) {
    return document;
  }
  return {
    ...document,
    lineItemTaxes: document.lineItemTaxes.map((line) => ({
      ...line,
      taxPercent: effectivePoLineTaxPercent(line.productId, line.taxPercent, productLookup),
    })),
  };
}

function purchaseOrderTotals(
  po: PurchaseOrder,
  productLookup?: ReadonlyMap<string, Product>,
): {
  document: PoDocumentMeta;
  subtotal: number;
  taxTotal: number;
  shippingAmount: number;
  grossTotal: number;
} {
  const { document } = parsePoRemarks(po.remarks);
  const sanitizedDocument = sanitizePoDocumentTaxes(document, productLookup);
  const subtotal = po.items.reduce((sum, item) => {
    const lineSubtotal = Number.isFinite(Number(item.lineValue))
      ? Number(item.lineValue)
      : computePoLineAmounts({ orderQty: item.orderQty, rate: item.rate }).subtotal;
    return sum + lineSubtotal;
  }, 0);

  let taxTotal = 0;
  if (sanitizedDocument.lineItemTaxes?.length) {
    taxTotal = po.items.reduce((sum, item) => {
      const taxPercent = taxPercentForProduct(sanitizedDocument.lineItemTaxes, item.productId);
      return (
        sum +
        computePoLineAmounts({
          orderQty: item.orderQty,
          rate: item.rate,
          taxPercent,
        }).taxAmount
      );
    }, 0);
  } else {
    const legacyTax = computeGstAmounts(subtotal, sanitizedDocument).totalTax;
    taxTotal = legacyTax > 0 ? legacyTax : Math.max(0, Number(sanitizedDocument.taxAmount) || 0);
  }

  const shippingAmount = Math.max(0, Number(sanitizedDocument.shippingAmount) || 0);
  const computedGrossTotal = subtotal + taxTotal + shippingAmount;

  return {
    document: sanitizedDocument,
    subtotal,
    taxTotal,
    shippingAmount,
    grossTotal: Math.max(computedGrossTotal, Number(po.totalValue) || 0),
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PurchaseOrdersPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const functionalCookiesEnabled = useCookieConsentStore((state) => state.preferences.functional);
  const canMutatePo = hasPermission(user, 'purchase_order:create');
  const canSendPoEmail = hasAnyPermission(user, 'purchase_order:create', 'purchase_order:approve');
  const [selectedShopId, setSelectedShopId] = useState('');
  const { data: shops = [] } = useShops();
  // Read the persisted active plant on EVERY render (not just at init). React Router
  // reuses this component instance across /purchase-orders/new <-> /purchase-orders, so a
  // useState initializer would only run once and miss the value written during create.
  // Reading sessionStorage each render guarantees the list filters by the plant the PO
  // was created under, regardless of remount/effect timing.
  let storedActiveShopId = '';
  try {
    storedActiveShopId = sessionStorage.getItem('po:activeShopId') ?? '';
  } catch {
    storedActiveShopId = '';
  }
  const effectiveSelectedShopId = selectedShopId || storedActiveShopId;
  const shopId = resolvePreferredOrgId(
    shops.map((shop) => shop.id),
    user?.shopId,
    effectiveSelectedShopId,
  );
  const deliveryPlantLocked = isShopScopedRole(user?.role) || shops.length <= 1;
  const [sourceType, setSourceType] = useState<'DIRECT' | 'RFQ' | 'CONTRACT'>('DIRECT');
  const [sourceRfqId, setSourceRfqId] = useState('');
  const [sourceContractId, setSourceContractId] = useState('');

  // ---- list filters ----
  const [search, setSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | PurchaseOrderStatus>('');
  const [lifecycleFilter, setLifecycleFilter] = useState<
    'ALL' | 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED'
  >('ALL');
  const [page, setPage] = useState(1);

  // ---- UI state ----
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: 'confirm'; id: string; poNumber: string } | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{
    id: string;
    poNumber: string;
  } | null>(null);
  const [formCancelConfirmOpen, setFormCancelConfirmOpen] = useState(false);

  // ---- queries ----
  const poQuery = usePurchaseOrders({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter || undefined,
    shopId: shopId || undefined,
  });

  const poData = poQuery.data?.data ?? [];
  const poMeta = poQuery.data?.meta;

  // When navigating back from the create form, force a refetch to show the new PO
  // immediately rather than relying solely on query invalidation timing.
  useEffect(() => {
    if (createOnly) return;
    const navState = location.state as { fromCreate?: boolean; shopId?: string } | null;
    if (!navState?.fromCreate) return;
    // If the PO was created under a specific plant, switch the list filter to it so the
    // new PO is visible (multi-plant owners only; shop-scoped users can't mismatch).
    if (navState.shopId && !user?.shopId) {
      setSelectedShopId(navState.shopId);
    } else {
      poQuery.refetch();
    }
    navigate(location.pathname, { replace: true, state: {} });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const poList = useMemo(() => poData, [poData]);

  const poTotal = useMemo(() => {
    if (poMeta?.total !== undefined) return poMeta.total;
    return undefined;
  }, [poMeta]);

  const filteredPoList = useMemo(() => {
    const supplierTerm = supplierSearch.trim().toLowerCase();
    return poList.filter((po) => {
      const lifecycle = (po.lifecycleStatus ?? po.status) as
        | 'DRAFT'
        | 'CONFIRMED'
        | 'PARTIALLY_RECEIVED'
        | 'FULLY_RECEIVED'
        | 'CANCELLED';

      if (lifecycleFilter !== 'ALL' && lifecycle !== lifecycleFilter) {
        return false;
      }
      if (supplierTerm && !po.supplier.toLowerCase().includes(supplierTerm)) {
        return false;
      }
      return true;
    });
  }, [lifecycleFilter, poList, supplierSearch]);

  const lifecycleCounts = useMemo(() => {
    const counts = {
      // ALL reflects the server-side total so the badge matches the paginated total
      // shown in the footer; per-lifecycle counts are best-effort over the visible page.
      ALL: poTotal ?? poList.length,
      DRAFT: 0,
      CONFIRMED: 0,
      PARTIALLY_RECEIVED: 0,
      FULLY_RECEIVED: 0,
      CANCELLED: 0,
    };
    for (const po of poList) {
      const lifecycle = (po.lifecycleStatus ?? po.status) as keyof typeof counts;
      if (lifecycle in counts) {
        counts[lifecycle] += 1;
      }
    }
    return counts;
  }, [poList, poTotal]);

  const detailQuery = usePurchaseOrder(detailId ?? '');
  const detailPO = detailId ? detailQuery.data : null;
  const emailHistoryQuery = useDocumentEmailHistory('purchase-order', detailId);
  const { data: supplierBills = [] } = useSupplierBills({
    shopId: detailPO?.shopId,
    take: 100,
  });
  const detailPoBills = useMemo(
    () => supplierBills.filter((bill) => bill.purchaseOrderId === detailPO?.id),
    [supplierBills, detailPO?.id],
  );

  const { data: rfqs = [] } = useRfqs();
  const rfqMap = useMemo(() => new Map(rfqs.map((r) => [r.id, r])), [rfqs]);
  const { data: contracts = [] } = useContracts();
  const { data: suppliers = [] } = useSuppliers();
  const { data: companies = [] } = useCompanies();
  const createSupplier = useCreateSupplier();
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [quickSupplier, setQuickSupplier] = useState({
    supplierName: '',
    contactPerson: '',
    email: '',
    phone: '',
  });
  // ---- mutations ----
  const createMut = useCreatePurchaseOrder();
  const updateMut = useUpdatePurchaseOrder();
  const confirmMut = useConfirmPurchaseOrder();
  const cancelMut = useCancelPurchaseOrder();
  const sendMut = useSendPurchaseOrder();

  // ---- form ----
  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      poDate: todayDateString(),
      priority: 'Medium',
      paymentTerms: 'Net 30',
      supplier: '',
      deliveryPlantId: shopId ?? '',
      storageLocationId: '',
      deliveryAddress: resolvePoDeliveryAddress(shops.find((s) => s.id === shopId)),
      remarks: '',
      ...defaultPoLogisticsFields(user?.name),
      items: [defaultPoLineItem()],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' }) ?? [];
  const selectedDeliveryPlantId = form.watch('deliveryPlantId');
  const selectedStorageLocationId = form.watch('storageLocationId');
  const manualNumberEnabled = form.watch('useManualPoNumber');
  const resolvedDeliveryPlantId =
    selectedDeliveryPlantId || shopId || (shops.length === 1 ? shops[0]?.id : '') || '';
  const productsQuery = useProducts({
    companyCatalog: true,
    shopId: resolvedDeliveryPlantId || shopId || undefined,
    isActive: true,
    limit: 100,
    page: 1,
  });
  const products = useMemo(
    () => productsQuery.data?.items ?? [],
    [productsQuery.data],
  );
  const { data: storageLocations = [] } = useStorageLocations(resolvedDeliveryPlantId || undefined);
  const resolvedStorageLocationId =
    selectedStorageLocationId ||
    (storageLocations.length === 1 ? storageLocations[0]?.id : '') ||
    '';
  const selectedRfq = sourceRfqId ? rfqMap.get(sourceRfqId) : undefined;
  const rfqPosRemaining = selectedRfq?.fulfillment?.posRemaining ?? null;
  const hasDeliveryPlant = Boolean(
    (selectedDeliveryPlantId || resolvedDeliveryPlantId || '').trim(),
  );
  const rfqBlocksNewLines =
    sourceType === 'RFQ' &&
    Boolean(sourceRfqId) &&
    rfqPosRemaining != null &&
    rfqPosRemaining <= 0;
  const canAddLineItems =
    hasDeliveryPlant && sourceType !== 'RFQ' && !rfqBlocksNewLines;
  const lineItemsHint = !hasDeliveryPlant
    ? 'Select a delivery plant first to add line items.'
    : sourceType === 'RFQ' && sourceRfqId
      ? rfqBlocksNewLines
        ? 'This RFQ already has the maximum purchase orders allowed. Edit the lines below or open the existing PO.'
        : 'Line items are loaded from the selected RFQ. Switch to Direct PO to add custom lines.'
      : rfqBlocksNewLines
        ? 'This RFQ already has the maximum purchase orders allowed.'
        : null;

  const resolveRfqItemIdForProduct = useCallback(
    (productId: string | undefined): string | undefined => {
      if (!productId?.trim() || sourceType !== 'RFQ' || !sourceRfqId) return undefined;
      const rfq = rfqMap.get(sourceRfqId);
      return rfq?.items?.find((line) => line.productId === productId)?.id;
    },
    [rfqMap, sourceRfqId, sourceType],
  );

  const applyDeliveryAddressFromPlant = useCallback(
    (plantId?: string) => {
      const id = plantId ?? form.getValues('deliveryPlantId');
      if (!id) return;
      const plant = shops.find((s) => s.id === id);
      form.setValue('deliveryAddress', resolvePoDeliveryAddress(plant));
    },
    [form, shops],
  );

  useEffect(() => {
    if (resolvedDeliveryPlantId) {
      applyDeliveryAddressFromPlant(resolvedDeliveryPlantId);
    }
  }, [resolvedDeliveryPlantId, applyDeliveryAddressFromPlant]);

  // Keep plant/location in sync when the user has one plant or when auth shop loads after mount.
  useEffect(() => {
    const formOpen = createOnly || sheetOpen;
    if (!formOpen) return;

    const plantId =
      form.getValues('deliveryPlantId') ||
      shopId ||
      (shops.length === 1 ? shops[0]?.id : '');
    if (plantId && form.getValues('deliveryPlantId') !== plantId) {
      form.setValue('deliveryPlantId', plantId, { shouldValidate: true });
      if (!user?.shopId) setSelectedShopId(plantId);
      applyDeliveryAddressFromPlant(plantId);
    }
  }, [
    createOnly,
    sheetOpen,
    shopId,
    shops,
    form,
    user?.shopId,
    applyDeliveryAddressFromPlant,
  ]);

  useEffect(() => {
    syncPreferredOrgId(user?.shopId ? null : shopId, functionalCookiesEnabled);
  }, [functionalCookiesEnabled, shopId, user?.shopId]);

  useEffect(() => {
    const formOpen = createOnly || sheetOpen;
    if (!formOpen || !resolvedDeliveryPlantId) return;

    const current = form.getValues('storageLocationId');
    if (current && storageLocations.some((loc) => loc.id === current)) return;

    if (storageLocations.length === 1) {
      form.setValue('storageLocationId', storageLocations[0]!.id, { shouldValidate: true });
    }
  }, [createOnly, sheetOpen, resolvedDeliveryPlantId, storageLocations, form]);

  const selectableProducts = useMemo(() => products, [products]);
  const productMap = useMemo(() => new Map(selectableProducts.map((p) => [p.id, p])), [selectableProducts]);
  const normalizedWatchedItems = useMemo(
    () =>
      watchedItems.map((item) => ({
        ...item,
        taxPercent: effectivePoLineTaxPercent(item.productId, item.taxPercent, productMap),
      })),
    [watchedItems, productMap],
  );
  const lineTotals = sumPoLineTotals(normalizedWatchedItems);
  const detailTotals = useMemo(
    () => (detailPO ? purchaseOrderTotals(detailPO, productMap) : null),
    [detailPO, productMap],
  );
  const detailRemarks = useMemo(
    () => (detailPO ? parsePoRemarks(detailPO.remarks).humanRemarks : ''),
    [detailPO],
  );

  const handleExportPoList = useCallback(() => {
    const ok = exportModuleCsv('purchase-orders.csv', filteredPoList, [
      { header: 'PO Number', value: (po) => po.poNumber },
      { header: 'PO Date', value: (po) => csvDate(po.poDate) },
      { header: 'Supplier', value: (po) => po.supplier },
      { header: 'Plant', value: (po) => po.shop?.shopName ?? '' },
      { header: 'Status', value: (po) => po.lifecycleStatus ?? po.status },
      {
        header: 'RFQ Number',
        value: (po) => (po.rfqId ? rfqMap.get(po.rfqId)?.rfqNumber ?? '' : ''),
      },
      { header: 'Items', value: (po) => po.items.length },
      {
        header: 'Ordered Qty',
        value: (po) => po.items.reduce((sum, item) => sum + Number(item.orderQty ?? 0), 0),
      },
      {
        header: 'Gross Amount',
        value: (po) => csvMoney(purchaseOrderTotals(po, productMap).grossTotal),
      },
      { header: 'Remarks', value: (po) => po.remarks ?? '' },
    ]);
    if (ok) toast.success('Purchase orders exported');
    else toast.error('No purchase orders to export');
  }, [filteredPoList, productMap, rfqMap]);

  const handleExportPoDetail = useCallback(
    (po: PurchaseOrder) => {
      const ok = exportModuleCsv(`${po.poNumber}.csv`, po.items.map((item) => ({ po, item })), [
        { header: 'PO Number', value: ({ po: current }) => current.poNumber },
        { header: 'PO Date', value: ({ po: current }) => csvDate(current.poDate) },
        { header: 'Supplier', value: ({ po: current }) => current.supplier },
        { header: 'Plant', value: ({ po: current }) => current.shop?.shopName ?? '' },
        { header: 'Status', value: ({ po: current }) => current.lifecycleStatus ?? current.status },
        {
          header: 'RFQ Number',
          value: ({ po: current }) =>
            current.rfqId ? rfqMap.get(current.rfqId)?.rfqNumber ?? '' : '',
        },
        { header: 'Product Code', value: ({ item }) => item.product?.productCode ?? '' },
        { header: 'Description', value: ({ item }) => item.product?.description ?? '' },
        { header: 'Order Qty', value: ({ item }) => item.orderQty },
        { header: 'Rate', value: ({ item }) => csvMoney(item.rate) },
        {
          header: 'Tax %',
          value: ({ po: current, item }) =>
            effectivePoLineTaxPercent(
              item.productId,
              taxPercentForProduct(parsePoRemarks(current.remarks).document.lineItemTaxes, item.productId),
              productMap,
            ),
        },
        {
          header: 'Gross Line Total',
          value: ({ po: current, item }) => {
            const taxPercent = effectivePoLineTaxPercent(
              item.productId,
              taxPercentForProduct(parsePoRemarks(current.remarks).document.lineItemTaxes, item.productId),
              productMap,
            );
            return csvMoney(
              computePoLineAmounts({
                orderQty: item.orderQty,
                rate: item.rate,
                taxPercent,
              }).lineTotal,
            );
          },
        },
        { header: 'Current Stock', value: ({ item }) => item.currentStock },
        { header: 'Min Stock', value: ({ item }) => item.minStock },
        { header: 'Suggested Qty', value: ({ item }) => item.suggestedQty },
        { header: 'Remarks', value: ({ po: current }) => current.remarks ?? '' },
      ]);
      if (ok) toast.success('Purchase order exported');
      else toast.error('No PO lines to export');
    },
    [productMap, rfqMap],
  );

  const openCreate = useCallback(() => {
    setEditingPO(null);
    form.reset({
      poDate: todayDateString(),
        priority: 'Medium',
        paymentTerms: 'Net 30',
      supplier: '',
        deliveryPlantId: shopId ?? '',
        storageLocationId: '',
        deliveryAddress: resolvePoDeliveryAddress(shops.find((s) => s.id === shopId)),
      remarks: '',
      useManualPoNumber: false,
      poNumberManual: '',
      ...defaultPoLogisticsFields(user?.name),
      items: [defaultPoLineItem()],
    });
    setSourceType('DIRECT');
    setSourceRfqId('');
    setSourceContractId('');
  }, [form, shopId, shops, user?.name]);

  useEffect(() => {
    const rfqPrefill = (location.state as PoPrefillState | null)?.rfqPrefill;
    if (rfqPrefill && location.pathname !== '/purchase-orders/new') {
      navigate('/purchase-orders/new', { state: location.state, replace: true });
      return;
    }
    if (!rfqPrefill) return;
    if (!productMap || productMap.size === 0) return;
    if (prefillAppliedRef.current) return;
    prefillAppliedRef.current = true;
    const items = rfqPrefill.items
      .map((line) => {
        const product = productMap.get(line.productId);
        if (!product) return null;
        return {
          productId: line.productId,
          rfqItemId: line.rfqItemId ?? undefined,
          lineDescription: product.description,
          lineCategory: product.category,
          currentStock: product.currentStock ?? 0,
          minStock: getProductPlant(product, rfqPrefill.shopId)?.minStockLevel ?? 0,
          suggestedQty: 0,
          orderQty: line.orderQty,
          rate: line.rate,
          taxPercent: '',
        };
      })
      .filter(Boolean) as POFormValues['items'];
    if (items.length === 0) {
      toast.error('No products found for RFQ prefill');
      return;
    }
    if (!user?.shopId) setSelectedShopId(rfqPrefill.shopId);
    form.reset({
      poDate: todayDateString(),
      priority: 'Medium',
      paymentTerms: 'Net 30',
      supplier: rfqPrefill.supplier ?? '',
      deliveryPlantId: rfqPrefill.shopId,
      storageLocationId: '',
      deliveryAddress: resolvePoDeliveryAddress(shops.find((s) => s.id === rfqPrefill.shopId)),
      remarks: '',
      useManualPoNumber: false,
      poNumberManual: '',
      ...defaultPoLogisticsFields(user?.name),
      items,
    });
    setSourceType('RFQ');
    setSourceRfqId(rfqPrefill.rfqId ?? '');
    setSourceContractId('');
    replace(items);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, productMap, form, shops, user?.name, user?.shopId, navigate, replace]);

  type PoPrefillState = {
    poPrefill?: {
      productId: string;
      shopId: string;
      supplier: string | null;
      orderQty: number;
      rate: number;
      currentStock: number;
      minStockLevel: number;
      suggestedQty: number;
      hasPriorOrder: boolean;
    lastPoNumber: string | null;
    };
  rfqPrefill?: {
    rfqId?: string;
    shopId: string;
    supplier?: string | null;
    items: Array<{ productId: string; rfqItemId?: string | null; orderQty: number; rate: number }>;
  };
  };

  const prefillAppliedRef = useRef(false);
  const newRouteInitializedRef = useRef(false);
  const submitIdempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (location.pathname !== '/purchase-orders/new') {
      prefillAppliedRef.current = false;
      newRouteInitializedRef.current = false;
      return;
    }
    const prefill = (location.state as PoPrefillState | null)?.poPrefill;
    if (!prefill) {
      if (!newRouteInitializedRef.current) {
        newRouteInitializedRef.current = true;
        openCreate();
      }
      return;
    }
    if (prefillAppliedRef.current) return;
    if (!productMap.has(prefill.productId)) return;

    prefillAppliedRef.current = true;
    if (!user?.shopId) setSelectedShopId(prefill.shopId);
    form.reset({
      poDate: todayDateString(),
      priority: 'Medium',
      paymentTerms: 'Net 30',
      supplier: prefill.supplier ?? '',
      deliveryPlantId: prefill.shopId,
      storageLocationId: '',
      deliveryAddress: resolvePoDeliveryAddress(shops.find((s) => s.id === prefill.shopId)),
      remarks:
        prefill.hasPriorOrder && prefill.lastPoNumber
          ? `Reorder (low stock) — last PO ${prefill.lastPoNumber}`
          : 'Reorder (low stock)',
      useManualPoNumber: false,
      poNumberManual: '',
      items: [
        {
          productId: prefill.productId,
          lineDescription: productMap.get(prefill.productId)?.description ?? '',
          lineCategory: productMap.get(prefill.productId)?.category ?? '',
          currentStock: prefill.currentStock,
          minStock: prefill.minStockLevel,
          suggestedQty: prefill.suggestedQty,
          orderQty: prefill.orderQty,
          rate: prefill.rate,
          taxPercent: '',
        },
      ],
    });
    setSourceType('DIRECT');
    setSourceRfqId('');
    setSourceContractId('');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, openCreate, productMap, form, navigate, shops, user?.shopId]);

  const openEdit = useCallback(
    (po: PurchaseOrder) => {
      setEditingPO(po);
      const { humanRemarks, document: docMeta } = parsePoRemarks(po.remarks);
      const shop = shops.find((s) => s.id === po.shopId);
      if (po.rfqId) {
        setSourceType('RFQ');
        setSourceRfqId(po.rfqId);
      } else if (po.contractId) {
        setSourceType('CONTRACT');
        setSourceContractId(po.contractId);
      } else {
        setSourceType('DIRECT');
      }
      form.reset({
        poDate: po.poDate.slice(0, 10),
        priority: 'Medium',
        supplier: po.supplier,
        deliveryPlantId: po.shopId,
        storageLocationId: '',
        deliveryAddress: resolvePoDeliveryAddress(shop),
        remarks: humanRemarks,
        useManualPoNumber: false,
        poNumberManual: po.poNumber,
        ...logisticsFieldsFromDocumentWithPayment(docMeta, 'Net 30'),
        items: po.items.map((it) => {
          const savedTaxPercent = taxPercentFromDocument(docMeta, it.productId);
          const effectiveTaxPercent = effectivePoLineTaxPercent(
            it.productId,
            savedTaxPercent,
            productMap,
          );
          return {
            productId: it.productId,
          lineDescription: it.lineDescription ?? it.product?.description ?? '',
          lineCategory: it.lineCategory ?? it.product?.category ?? '',
            rfqItemId: (it as { rfqItemId?: string | null }).rfqItemId ?? undefined,
            currentStock: it.currentStock,
            minStock: it.minStock,
            suggestedQty: it.suggestedQty,
            orderQty: it.orderQty,
            rate: it.rate,
            taxPercent:
              effectiveTaxPercent > 0
                ? effectiveTaxPercent
                : productMap.get(it.productId)?.taxPreference === 'NON_TAXABLE'
                  ? 0
                  : '',
          };
        }),
      });
      setSheetOpen(true);
    },
    [form, productMap, shops],
  );

  async function handleDownloadPoPdf(po: PurchaseOrder) {
    try {
      await downloadDocumentPdf('purchase-order', po.id);
      toast.success('PDF downloaded');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not generate PDF'));
    }
  }

  // Auto-fill product fields when product selection changes
  function handleProductChange(idx: number, productId: string) {
    const p = productMap.get(productId);
    if (!p) return;
    const plantId = selectedDeliveryPlantId || shopId || '';
    const plantStock = plantId ? p.stockByShop?.[plantId] : undefined;
    const currentStock = plantStock ?? p.currentStock ?? 0;
    const plantAssignment = plantId ? getProductPlant(p, plantId) : undefined;
    const minStock = plantAssignment?.minStockLevel ?? 0;
    const suggestedQty = Math.max(0, minStock - currentStock);
    const defaultQty = suggestedQty > 0 ? suggestedQty : 1;
    const rfqItemId = resolveRfqItemIdForProduct(productId);

    form.setValue(`items.${idx}.currentStock`, currentStock, { shouldDirty: true });
    form.setValue(`items.${idx}.minStock`, minStock, { shouldDirty: true });
    form.setValue(`items.${idx}.suggestedQty`, suggestedQty, { shouldDirty: true });
    form.setValue(`items.${idx}.orderQty`, defaultQty, { shouldDirty: true });
    form.setValue(`items.${idx}.lineDescription`, p.description ?? '', { shouldDirty: true });
    form.setValue(`items.${idx}.lineCategory`, p.category ?? '', { shouldDirty: true });
    form.setValue(`items.${idx}.rate`, p.purchasePrice ?? 0, { shouldDirty: true });
    form.setValue(`items.${idx}.taxPercent`, p.taxPreference === 'NON_TAXABLE' ? 0 : '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue(`items.${idx}.rfqItemId`, rfqItemId, { shouldDirty: true });
  }

  async function handleQuickSupplierCreate() {
    if (!quickSupplier.supplierName.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    try {
      const created = await createSupplier.mutateAsync({
        supplierName: quickSupplier.supplierName.trim(),
        contactPerson: quickSupplier.contactPerson.trim() || 'Contact',
        email: quickSupplier.email.trim() || `supplier-${Date.now()}@placeholder.local`,
        phone: quickSupplier.phone.trim() || '0000000000',
        companyId: companies[0]?.id,
        paymentTerms: form.getValues('paymentTerms') || 'Net 30',
        categories: [],
      });
      form.setValue('supplier', created.supplierName);
      setSupplierDialogOpen(false);
      setQuickSupplier({ supplierName: '', contactPerson: '', email: '', phone: '' });
      toast.success(`Supplier "${created.supplierName}" created`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed to create supplier');
    }
  }

  function apiErrorMessage(e: unknown): string | undefined {
    return getApiErrorMessage(e, '');
  }

  function isApiNotFound(e: unknown): boolean {
    const err = e as { response?: { status?: number }; message?: string };
    if (err.response?.status === 404) return true;
    const msg = apiErrorMessage(e) ?? '';
    return /cannot\s+post/i.test(msg);
  }

  async function handleSubmit(values: POFormValues, sendNow = false) {
    try {
      const resolvedShopId = values.deliveryPlantId || shopId;
      if (!resolvedShopId) {
        toast.error('Select a delivery plant');
        return;
      }
      if (values.useManualPoNumber && !values.poNumberManual?.trim()) {
        toast.error('Enter a PO number or disable manual numbering.');
        return;
      }
      const normalizedValues: POFormValues = {
        ...values,
        items: values.items.map((item) => {
          const product = item.productId ? productMap.get(item.productId) : undefined;
          const hasProduct = Boolean(item.productId?.trim());
          const description = item.lineDescription?.trim() || product?.description || '';
          const category = hasProduct
            ? item.lineCategory?.trim() || product?.category || ''
            : description
              ? 'Service'
              : item.lineCategory?.trim() || '';
          const rfqItemId =
            item.rfqItemId?.trim() || resolveRfqItemIdForProduct(item.productId) || undefined;
          return {
            ...item,
            productId: hasProduct ? item.productId : '',
            rfqItemId,
            lineDescription: description,
            lineCategory: category,
            taxPercent: effectivePoLineTaxPercent(item.productId ?? '', item.taxPercent, productMap),
          };
        }),
      };

      if (sourceType === 'RFQ' && sourceRfqId) {
        const missingRfqLink = normalizedValues.items.some(
          (item) => item.productId?.trim() && !item.rfqItemId?.trim(),
        );
        if (missingRfqLink) {
          toast.error(
            'Each product line must match an RFQ item. Re-select the RFQ to reload lines.',
          );
          return;
        }
      }
      const deliveryShop = shops.find((s) => s.id === resolvedShopId);
      const payload = mapPoFormToCreatePayload({
        values: normalizedValues,
        resolvedShopId,
        shop: deliveryShop,
        sourceType,
        sourceRfqId,
        sourceContractId,
      });

      if (sendNow) {
        const supplier = suppliers.find((s) => s.supplierName === normalizedValues.supplier);
        // Only block if the supplier record is loaded AND confirmed to have no email.
        // If suppliers haven't loaded yet (empty array), skip the check and let the
        // backend validate — it returns a safe error via sendToSupplierSafe.
        if (supplier !== undefined && !supplier.email) {
          toast.error('Add an email address to the supplier before sending.');
          return;
        }
      }

      let result;
      if (editingPO) {
        const updatePayload = {
          id: editingPO.id,
          ...payload,
        };
        result = await updateMut.mutateAsync(updatePayload);

        if (sendNow) {
          // Confirm the draft PO first
          await confirmMut.mutateAsync(editingPO.id);
          // Then send to supplier (which queues the email with PDF)
          const emailDelivery = await sendMut.mutateAsync({ id: editingPO.id });
          result = { ...result, emailDelivery };
        }
      } else {
        if (!submitIdempotencyKeyRef.current) {
          submitIdempotencyKeyRef.current =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `po-${Date.now()}`;
        }
        const idempotencyKey = submitIdempotencyKeyRef.current;
        const createPayload = {
          ...payload,
          idempotencyKey,
          confirmOnSend: sendNow,
          ...(sendNow ? { sendToSupplier: true } : {}),
        };

        result = await createMut.mutateAsync(createPayload);
        submitIdempotencyKeyRef.current = null;
      }

      if (sendNow) {
        const emailDelivery = result.emailDelivery;
        if (emailDelivery?.queued) {
          toast.warning(
            emailDelivery.message ??
              `Purchase order ${result.poNumber} queued for email delivery (PDF pending).`,
          );
        } else if (emailDelivery?.sent === false) {
          toast.warning(
            emailDelivery.message ??
              `Purchase order ${result.poNumber} saved, but email could not be sent. Retry from the PO detail view.`,
          );
        } else {
          toast.success(`Purchase order ${result.poNumber} emailed to supplier`);
        }
      } else {
        toast.success(`Purchase order ${result.poNumber} saved as draft`);
      }
      if (createOnly) {
        // The PO may have been saved under a delivery plant other than the list's
        // default filter (resolvePreferredOrgId falls back to the cookie/first shop on
        // a fresh mount). Persist the created PO's plant so the list initializes its
        // filter to where the PO actually lives — otherwise the new PO stays hidden.
        if (result.shopId) {
          try {
            sessionStorage.setItem('po:activeShopId', result.shopId);
          } catch {
            /* sessionStorage unavailable — fall back to nav state below */
          }
          setSelectedShopId(result.shopId);
        }
        queryClient.invalidateQueries({ queryKey: poKeys.lists() });
        navigate('/purchase-orders', { state: { fromCreate: true, shopId: result.shopId } });
        return;
      }
      setSheetOpen(false);
      form.reset();
      setDetailId(result.id);
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e) ?? (editingPO ? 'Failed to update purchase order' : 'Failed to create purchase order'));
    }
  }

  const submitDraft = form.handleSubmit((values) => handleSubmit(values, false));
  const submitSend = form.handleSubmit((values) => handleSubmit(values, true));

  async function handleResendToSupplier(po: PurchaseOrder) {
    try {
      const result = await sendMut.mutateAsync({ id: po.id, resend: true }) as {
        to?: string;
        pdfAttached?: boolean;
        sent?: boolean;
        queued?: boolean;
        message?: string;
        emailStatus?: string;
      };
      const to = result?.to?.trim();
      if (result?.queued) {
        toast.warning(
          result.message ??
            `Purchase order ${po.poNumber} is queued for email delivery (PDF pending).`,
        );
        return;
      }
      const pdfNote = result?.pdfAttached === false ? ' (PDF attachment could not be generated)' : '';
      toast.success(
        to
          ? `Purchase order ${po.poNumber} emailed to ${to}${pdfNote}`
          : `Purchase order ${po.poNumber} emailed to supplier${pdfNote}`,
      );
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 403) {
        toast.error('You do not have permission to email purchase orders.');
        return;
      }
      if (isApiNotFound(e)) {
        toast.error(
          'Send endpoint not found. Restart the API so POST /purchase-orders/:id/send is available.',
        );
        return;
      }
      toast.error(apiErrorMessage(e) ?? 'Failed to email purchase order to supplier');
    }
  }

  async function handleConfirm(id: string) {
    try {
      await confirmMut.mutateAsync(id);
      toast.success('Purchase order confirmed');
    } catch {
      toast.error('Failed to confirm purchase order');
    }
    setConfirmState(null);
  }

  async function handleCancelPo() {
    if (!cancelDialog) return;
    try {
      await cancelMut.mutateAsync(cancelDialog.id);
      toast.success('Purchase order cancelled');
      setCancelDialog(null);
      setDetailId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to cancel purchase order'));
    }
  }

  function handleConvertToGR(poId: string) {
    navigate(`/goods-receipts/new?fromPo=${poId}`);
  }

  // ---- product search in form ----
  const [productSearch, setProductSearch] = useState('');

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return selectableProducts;
    const s = productSearch.toLowerCase();
    return selectableProducts.filter(
      (p) => p.description.toLowerCase().includes(s) || p.productCode.toLowerCase().includes(s),
    );
  }, [selectableProducts, productSearch]);

  useEffect(() => {
    watchedItems.forEach((item, idx) => {
      if (!item?.productId) return;
      const product = productMap.get(item.productId);
      if (product?.taxPreference !== 'NON_TAXABLE') return;
      const currentTax = item.taxPercent;
      if (currentTax === 0 || currentTax === '0') return;
      form.setValue(`items.${idx}.taxPercent`, 0, {
        shouldDirty: currentTax !== '' && currentTax !== undefined,
        shouldValidate: true,
      });
    });
  }, [form, productMap, watchedItems]);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
  }

  function lifecycleSteps(po: PurchaseOrder, bills = detailPoBills): P2PStep[] {
    const status = po.lifecycleStatus ?? po.status;
    const hasBill = bills.length > 0;
    const billPaid = bills.some((bill) => {
      const total = Number(bill.totalValue ?? 0);
      const paid = Number(bill.paidValue ?? 0);
      return total > 0 && paid >= total;
    });
    const invoiceState =
      billPaid || hasBill
        ? 'done'
        : status === 'FULLY_RECEIVED'
          ? 'active'
          : 'todo';
    const paymentState = billPaid ? 'done' : hasBill ? 'active' : 'todo';
    return [
      { key: 'po', label: 'PO confirmed', state: status === 'DRAFT' ? 'active' : 'done' },
      {
        key: 'partial',
        label: 'Partial GR',
        state: status === 'PARTIALLY_RECEIVED' ? 'active' : status === 'FULLY_RECEIVED' ? 'done' : 'todo',
      },
      { key: 'full', label: 'PO fully received', state: status === 'FULLY_RECEIVED' ? 'done' : 'todo' },
      { key: 'invoice', label: 'Invoice & payable', state: invoiceState },
      { key: 'payment', label: 'Payment tracking', state: paymentState },
    ];
  }


  const poActionButtons = (
    <>
      <Button
        type="button"
        variant="outline"
        {...(createOnly ? { form: 'po-form' } : {})}
        onClick={() => {
          if (form.formState.isDirty) {
            setFormCancelConfirmOpen(true);
          } else {
            form.reset();
            setSheetOpen(false);
            if (location.pathname === '/purchase-orders/new') {
              navigate('/purchase-orders');
            }
          }
        }}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        {...(createOnly ? { form: 'po-form' } : {})}
        disabled={createMut.isPending || sendMut.isPending || !canMutatePo}
      >
        <ShoppingCart className="h-4 w-4" />
        {createMut.isPending ? 'Saving...' : 'Save as Draft'}
      </Button>
      <Button
        type="button"
        onClick={submitSend}
        disabled={createMut.isPending || sendMut.isPending || !canMutatePo}
      >
        <Send className="mr-2 h-4 w-4" />
        {sendMut.isPending ? 'Sending...' : 'Save & Send'}
      </Button>
    </>
  );

  const purchaseOrderForm = (
<form
      id="po-form"
      onSubmit={submitDraft}
      className={cn(createOnly ? 'space-y-5' : 'mt-6 space-y-5')}
    >
      {!editingPO && (
        <FormSection title="Order Source" hint="Choose how this PO is created">
          <FormGrid cols={3}>
            <div className="space-y-1">
              <Label className="text-xs">PO Type</Label>
              <Select value={sourceType} onValueChange={(v: 'DIRECT' | 'RFQ' | 'CONTRACT') => setSourceType(v)}>
                <SelectTrigger className={PO_SELECT_TRIGGER}><SelectValue /></SelectTrigger>
                <SelectContent className={PO_SELECT_CONTENT}>
                  <SelectItem value="DIRECT">Direct PO</SelectItem>
                  <SelectItem value="RFQ">From RFQ</SelectItem>
                  <SelectItem value="CONTRACT">From Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sourceType === 'RFQ' && (
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">RFQ</Label>
                <Select
                  value={sourceRfqId || undefined}
                  onValueChange={(id) => {
                    setSourceRfqId(id);
                    const rfq = rfqMap.get(id);
                    if (!rfq) return;
                    const plantId = rfq.shopId ?? rfq.shop?.id ?? '';
                    if (plantId) {
                      form.setValue('deliveryPlantId', plantId);
                      if (!user?.shopId) setSelectedShopId(plantId);
                      const plant = shops.find((s) => s.id === plantId) ?? rfq.shop;
                      form.setValue('storageLocationId', '');
                      applyDeliveryAddressFromPlant(plantId);
                    }
                    form.setValue('supplier', rfq.suppliers?.[0]?.supplier?.supplierName ?? '');
                    const remainingLines =
                      rfq.fulfillment?.lines?.filter((l) => l.remainingQty > 0) ?? rfq.fulfillment?.lines ?? [];
                    if ((rfq.fulfillment?.posRemaining ?? 1) <= 0 || remainingLines.length === 0) {
                      replace([defaultPoLineItem()]);
                      toast.error('All RFQ lines are already allocated to purchase orders');
                      return;
                    }
                    const itemMap = new Map((rfq.items ?? []).map((it) => [it.id, it]));
                    const nextItems: POFormValues['items'] = remainingLines.flatMap((line) => {
                      const rfqItem = itemMap.get(line.rfqItemId);
                      const productId = rfqItem?.productId ?? rfqItem?.product?.id ?? '';
                      if (!productId) return [];
                      return [
                        {
                          productId,
                          rfqItemId: line.rfqItemId,
                          lineDescription: rfqItem?.product?.description ?? rfqItem?.description ?? '',
                          lineCategory: rfqItem?.product?.category ?? '',
                          currentStock: 0,
                          minStock: 0,
                          suggestedQty: Number(line.remainingQty ?? 0),
                          orderQty: Number(line.remainingQty ?? 0),
                          rate: Number(rfqItem?.product?.purchasePrice ?? 0),
                          taxPercent: '',
                        },
                      ];
                    });
                    replace(nextItems.length > 0 ? nextItems : [defaultPoLineItem()]);
                  }}
                >
                  <SelectTrigger className={PO_SELECT_TRIGGER}><SelectValue placeholder="Select RFQ" /></SelectTrigger>
                  <SelectContent className={PO_SELECT_CONTENT}>
                    {rfqs.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.rfqNumber} - {r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sourceRfqId && selectedRfq?.fulfillment && (
                  <p className="text-[11px] text-muted-foreground">
                    RFQ progress: {selectedRfq.fulfillment.linesFullyOrdered}/{selectedRfq.fulfillment.totalLines} lines ordered ·
                    POs {selectedRfq.fulfillment.posCreated}/{selectedRfq.fulfillment.maxPos} (remaining {selectedRfq.fulfillment.posRemaining})
                  </p>
                )}
              </div>
            )}
            {sourceType === 'CONTRACT' && (
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Contract</Label>
                <Select
                  value={sourceContractId}
                  onValueChange={(id) => {
                    setSourceContractId(id);
                    const contract = contracts.find((c) => c.id === id);
                    if (!contract) return;
                    form.setValue('supplier', contract.supplier?.supplierName ?? '');
                    replace(
                      ((contract as { items?: Array<{ productId?: string; quantity?: number; unitPrice?: number }> }).items ?? []).map(
                        (it) => ({
                          productId: it.productId ?? '',
                          rfqItemId: undefined,
                          lineDescription: '',
                          lineCategory: '',
                          currentStock: 0,
                          minStock: 0,
                          suggestedQty: Number(it.quantity ?? 0),
                          orderQty: Number(it.quantity ?? 0),
                          rate: Number(it.unitPrice ?? 0),
                          taxPercent: '' as string | number,
                        }),
                      ),
                    );
                  }}
                >
                  <SelectTrigger className={PO_SELECT_TRIGGER}><SelectValue placeholder="Select Contract" /></SelectTrigger>
                  <SelectContent className={PO_SELECT_CONTENT}>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.contractNumber} - {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </FormGrid>
        </FormSection>
      )}

      <FormSection title="Order Details & Delivery">
        <FormGrid cols={3}>
          <div className="space-y-1">
            <Label className="text-xs">Delivery Plant *</Label>
            <Controller
              control={form.control}
              name="deliveryPlantId"
              render={({ field }) => (
                <Select
                  value={field.value || ''}
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (!user?.shopId) setSelectedShopId(value);
                    form.setValue('storageLocationId', '');
                    applyDeliveryAddressFromPlant(value);
                  }}
                  disabled={deliveryPlantLocked}
                >
                  <SelectTrigger
                    className={cn(
                      PO_SELECT_TRIGGER,
                      deliveryPlantLocked && 'opacity-80',
                      form.formState.errors.deliveryPlantId && 'border-destructive',
                    )}
                  >
                    <SelectValue placeholder="Select plant" />
                  </SelectTrigger>
                  <SelectContent className={PO_SELECT_CONTENT} position="popper">
                    {shops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.shopName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.deliveryPlantId && (
              <p className="text-[10px] text-destructive">
                {form.formState.errors.deliveryPlantId.message}
              </p>
            )}
            {deliveryPlantLocked && shops.length <= 1 && (
              <p className="text-[10px] text-muted-foreground">Only one plant is available for your organisation.</p>
            )}
            {deliveryPlantLocked && shops.length > 1 && isShopScopedRole(user?.role) && (
              <p className="text-[10px] text-muted-foreground">Locked to your assigned plant.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Storage Location (optional)</Label>
            <Controller
              control={form.control}
              name="storageLocationId"
              render={({ field }) => (
                <Select
                  value={field.value || ''}
                  onValueChange={(locId) => {
                    field.onChange(locId);
                    applyDeliveryAddressFromPlant();
                  }}
                  disabled={!selectedDeliveryPlantId}
                >
                  <SelectTrigger
                    className={cn(
                      PO_SELECT_TRIGGER,
                      form.formState.errors.storageLocationId && 'border-destructive',
                    )}
                  >
                    <SelectValue placeholder="Select storage" />
                  </SelectTrigger>
                  <SelectContent className={PO_SELECT_CONTENT} position="popper">
                    {storageLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.storageLocationId && (
              <p className="text-[10px] text-destructive">
                {form.formState.errors.storageLocationId.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="supplier" className="text-xs">Supplier *</Label>
            <Controller
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    if (v === CREATE_SUPPLIER_OPTION) {
                      setSupplierDialogOpen(true);
                      return;
                    }
                    field.onChange(v);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      PO_SELECT_TRIGGER,
                      form.formState.errors.supplier && 'border-destructive',
                    )}
                  >
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent className={PO_SELECT_CONTENT}>
                    <SelectItem value={CREATE_SUPPLIER_OPTION} className="font-medium text-primary">
                      + Create new supplier
                    </SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.supplierName}>
                        {s.supplierName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.supplier && (
              <p className="text-[10px] text-destructive">{form.formState.errors.supplier.message}</p>
            )}
          </div>
        </FormGrid>
        <FormGrid cols={4}>
          <div className="space-y-1">
            <Label htmlFor="poDate" className="text-xs">PO Date</Label>
            <Input
              id="poDate"
              type="date"
              max={todayDateString()}
              className="h-8 text-xs"
              {...form.register('poDate')}
            />
            <p className="text-[10px] text-muted-foreground">Date the order is issued (today or earlier)</p>
            {form.formState.errors.poDate && (
              <p className="text-[10px] text-destructive">{form.formState.errors.poDate.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment Terms</Label>
            <Controller
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={PO_SELECT_TRIGGER}>
                    <SelectValue placeholder="Payment terms" />
                  </SelectTrigger>
                  <SelectContent className={PO_SELECT_CONTENT}>
                    <SelectItem value="Immediate">Immediate</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 45">Net 45</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Requested By</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Name"
              {...form.register('requisitioner')}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Department</Label>
            <Controller
              control={form.control}
              name="department"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className={PO_SELECT_TRIGGER}>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className={PO_SELECT_CONTENT}>
                    {DEPARTMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={PO_SELECT_TRIGGER}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className={PO_SELECT_CONTENT}>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label className="text-xs">PO numbering</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!manualNumberEnabled}
                onChange={(e) =>
                  form.setValue('useManualPoNumber', e.target.checked, { shouldDirty: true })
                }
              />
              <span className="text-xs">Enter PO number manually</span>
              <Input
                className="h-8 text-xs sm:w-64"
                placeholder="PO-0001"
                disabled={!manualNumberEnabled}
                {...form.register('poNumberManual')}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Leave unchecked to auto-generate.</p>
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label className="text-xs">Delivery address</Label>
            <p className="text-[10px] text-muted-foreground">
              From selected plant
              {shops.find((s) => s.id === resolvedDeliveryPlantId)?.shopName
                ? `: ${shops.find((s) => s.id === resolvedDeliveryPlantId)!.shopName}`
                : ''}
            </p>
            <Input
              readOnly
              className="h-8 cursor-default bg-muted/80 text-xs"
              {...form.register('deliveryAddress')}
            />
          </div>
        </FormGrid>
      </FormSection>

      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Supplier</DialogTitle>
            <DialogDescription>Add a supplier and use it on this purchase order.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Supplier Name *</Label>
              <Input
                className="h-8 text-sm"
                value={quickSupplier.supplierName}
                onChange={(e) =>
                  setQuickSupplier((p) => ({ ...p, supplierName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Person</Label>
              <Input
                className="h-8 text-sm"
                value={quickSupplier.contactPerson}
                onChange={(e) =>
                  setQuickSupplier((p) => ({ ...p, contactPerson: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  className="h-8 text-sm"
                  type="email"
                  value={quickSupplier.email}
                  onChange={(e) => setQuickSupplier((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  className="h-8 text-sm"
                  value={quickSupplier.phone}
                  onChange={(e) => setQuickSupplier((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSupplierDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={createSupplier.isPending}
              onClick={handleQuickSupplierCreate}
            >
              {createSupplier.isPending ? 'Saving…' : 'Create & Select'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PoLogisticsTaxFields form={form} />

      <FormSection title="Remarks">
        <Textarea
          id="remarks"
          rows={2}
          placeholder="Optional notes…"
          {...form.register('remarks')}
        />
      </FormSection>

      <FormSection
        title="Line Items"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(defaultPoLineItem())}
            disabled={!canAddLineItems}
            className="w-full sm:w-auto"
          >
            <Plus className="h-3 w-3" /> Add Item
          </Button>
        }
      >
        {!canAddLineItems && lineItemsHint && (
          <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {lineItemsHint}
          </div>
        )}

        {form.formState.errors.items?.root && (
          <p className="mb-2 text-xs text-destructive">{form.formState.errors.items.root.message}</p>
        )}

        {/* Items table */}
        <div className="overflow-x-auto rounded-md border">
          <Table className="table-fixed w-full min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%]">Product</TableHead>
                <TableHead className="w-[8%] text-right">Stock</TableHead>
                <TableHead className="w-[18%]">Description</TableHead>
                <TableHead className="w-[10%] text-right">Order Qty</TableHead>
                <TableHead className="w-[8%]">UOM</TableHead>
                <TableHead className="w-[11%] text-right">Rate</TableHead>
                <TableHead className="w-[8%] text-right">Tax %</TableHead>
                <TableHead className="w-[12%] text-right">Gross Line Total</TableHead>
                <TableHead className="w-[7%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, idx) => {
                const row = watchedItems[idx] ?? {};
                const product = productMap.get(row.productId ?? '');
                const isNonTaxable = product?.taxPreference === 'NON_TAXABLE';
                const line = computePoLineAmounts({
                  ...row,
                  taxPercent: effectivePoLineTaxPercent(
                    row.productId ?? '',
                    row.taxPercent,
                    productMap,
                  ),
                });

                return (
                  <TableRow key={field.id}>
                    <Controller
                      control={form.control}
                      name={`items.${idx}.rfqItemId`}
                      render={({ field: rfqField }) => <input type="hidden" {...rfqField} value={rfqField.value ?? ''} />}
                    />
                    {/* Product select */}
                    <TableCell className="overflow-hidden">
                      <Controller
                        control={form.control}
                        name={`items.${idx}.productId`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value || '__none__'}
                            onValueChange={(v) => {
                              if (v === '__none__') {
                                f.onChange('');
                                form.setValue(`items.${idx}.lineCategory`, 'Service', { shouldDirty: true });
                                form.setValue(`items.${idx}.rfqItemId`, undefined, { shouldDirty: true });
                                return;
                              }
                              f.onChange(v);
                              handleProductChange(idx, v);
                            }}
                          >
                            <SelectTrigger className={cn('h-8 w-full max-w-full text-xs', PO_SELECT_TRIGGER)}>
                              <SelectValue placeholder="Product (optional)…" className="truncate" />
                            </SelectTrigger>
                            <SelectContent className={PO_SELECT_CONTENT}>
                              <SelectItem value="__none__">— Service / no product —</SelectItem>
                              <div className="p-2">
                                <Input
                                  placeholder="Search products..."
                                  value={productSearch}
                                  onChange={(e) => setProductSearch(e.target.value)}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  className="mb-2"
                                />
                              </div>
                              {filteredProducts.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  <span className="font-medium">{p.productCode}</span>
                                  <span className="ml-1 text-muted-foreground">- {p.description}</span>
                                </SelectItem>
                              ))}
                              {filteredProducts.length === 0 && (
                                <p className="px-2 py-4 text-center text-sm text-muted-foreground">No products found</p>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.items?.[idx]?.productId && (
                        <p className="mt-0.5 text-[10px] text-destructive">
                          {form.formState.errors.items[idx]?.productId?.message}
                        </p>
                      )}
                    </TableCell>

                    {/* Current Stock (read-only) */}
                    <TableCell className="text-right">
                      <Input
                        readOnly
                        tabIndex={-1}
                        className="h-8 w-full bg-muted text-right text-xs"
                        value={String(numPo(row.currentStock))}
                      />
                    </TableCell>

                    {/* Description (editable) */}
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          className="h-8 w-full text-xs"
                          placeholder={product?.description ?? 'Description (required if no product)'}
                          {...form.register(`items.${idx}.lineDescription`)}
                          onChange={(e) => {
                            form.setValue(`items.${idx}.lineDescription`, e.target.value, {
                              shouldDirty: true,
                            });
                            const next = e.target.value.trim();
                            const productId = form.getValues(`items.${idx}.productId`);
                            if (!productId?.trim() && next) {
                              form.setValue(`items.${idx}.lineCategory`, 'Service', { shouldDirty: true });
                            }
                          }}
                          onBlur={(e) => {
                            const next = e.target.value?.trim();
                            const productId = form.getValues(`items.${idx}.productId`);
                            if (!productId?.trim() && next) {
                              form.setValue(`items.${idx}.lineCategory`, 'Service', { shouldDirty: true });
                            }
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Category: {row.lineCategory || product?.category || '—'}
                        </p>
                      </div>
                    </TableCell>

                    {/* Order Qty (editable) */}
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        className="h-8 w-full text-right text-xs"
                        {...form.register(`items.${idx}.orderQty`, {
                          onChange: () => form.trigger(`items.${idx}.orderQty`),
                        })}
                      />
                      {form.formState.errors.items?.[idx]?.orderQty && (
                        <p className="mt-0.5 text-[10px] text-destructive">
                          {form.formState.errors.items[idx]?.orderQty?.message}
                        </p>
                      )}
                    </TableCell>

                    {/* UOM (from product) */}
                    <TableCell>
                      <Input
                        readOnly
                        tabIndex={-1}
                        className="h-8 w-full truncate bg-muted text-xs"
                        value={product?.uom ?? ''}
                        placeholder="—"
                      />
                    </TableCell>

                    {/* Rate (editable) */}
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-8 w-full text-right text-xs"
                        {...form.register(`items.${idx}.rate`, {
                          onChange: () => form.trigger(`items.${idx}.rate`),
                        })}
                      />
                    </TableCell>

                    {/* Tax % (per line) */}
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        className="h-8 w-full text-right text-xs"
                        placeholder={isNonTaxable ? 'Fixed at 0' : '0'}
                        value={
                          isNonTaxable
                            ? 0
                            : row.taxPercent === undefined || row.taxPercent === null
                              ? ''
                              : row.taxPercent
                        }
                        disabled={isNonTaxable}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          form.setValue(
                            `items.${idx}.taxPercent`,
                            nextValue === '' ? '' : Number(nextValue),
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                      />
                    </TableCell>

                    {/* Line Value (qty × rate + tax) */}
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {numPo(row.orderQty) > 0 && numPo(row.rate) > 0 ? (
                        formatCurrency(line.lineTotal)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Remove */}
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => fields.length > 1 && remove(idx)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={7} className="text-right text-xs text-muted-foreground">
                  Subtotal (Excl. GST)
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {formatCurrency(lineTotals.subtotal)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={7} className="text-right text-xs text-muted-foreground">
                  GST / Tax
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {formatCurrency(lineTotals.taxTotal)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={7} className="text-right font-semibold">
                  Gross Amount
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums">
                  {formatCurrency(lineTotals.grandTotal)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </FormSection>

      {!createOnly && (
        <div className="flex items-center gap-3 border-t border-border pt-4">
          {poActionButtons}
        </div>
      )}
    </form>
  );

  if (createOnly) {
    return (
      <AppLayout>
        <CreatePageLayout
          title="Create Purchase Order"
          description="Fill in details to create a new purchase order"
          backTo="/purchase-orders"
          actionBar={poActionButtons}
        >
          {purchaseOrderForm}
        </CreatePageLayout>
        <ConfirmDialog
          open={!!confirmState}
          onOpenChange={(open) => !open && setConfirmState(null)}
          title="Confirm Purchase Order"
          description={`Confirm ${confirmState?.poNumber ?? 'this order'}? This will lock the PO for receiving.`}
          confirmLabel="Confirm"
          onConfirm={() => confirmState && handleConfirm(confirmState.id)}
          loading={confirmMut.isPending}
        />
        <ConfirmDialog
          open={!!cancelDialog}
          onOpenChange={(open) => !open && setCancelDialog(null)}
          title="Cancel Purchase Order"
          description={`Are you sure you want to cancel ${cancelDialog?.poNumber ?? 'this order'}? This cannot be undone.`}
          confirmLabel="Cancel Order"
          variant="destructive"
          onConfirm={handleCancelPo}
          loading={cancelMut.isPending}
        />
        <ConfirmDialog
          open={formCancelConfirmOpen}
          onOpenChange={(open) => !open && setFormCancelConfirmOpen(false)}
          title="Discard changes?"
          description="All the data you have entered will be lost. Are you sure you want to cancel?"
          confirmLabel="Yes, discard"
          variant="destructive"
          onConfirm={() => {
            form.reset();
            setFormCancelConfirmOpen(false);
            setSheetOpen(false);
            if (location.pathname === '/purchase-orders/new') {
              navigate('/purchase-orders');
            }
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div>
        <PageHeader
          title="Purchase Orders"
          description="Manage purchase order documents"
        >
          <Button variant="outline" onClick={handleExportPoList} className="w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => navigate('/purchase-orders/new')} className="premium-button w-full border-0 text-white sm:w-auto" disabled={!canMutatePo}>
            <Plus className="h-4 w-4" />
            Create PO
          </Button>
        </PageHeader>

          {/* Toolbar */}
          <Card className="surface-1 mb-3 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {([
            ['ALL', 'All'],
            ['DRAFT', 'Draft'],
            ['CONFIRMED', 'Confirmed'],
            ['PARTIALLY_RECEIVED', 'Partially Received'],
            ['FULLY_RECEIVED', 'Completed'],
            ['CANCELLED', 'Cancelled'],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={lifecycleFilter === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setLifecycleFilter(value);
                setPage(1);
              }}
              className="h-7 px-2.5 text-xs"
            >
              {label} ({lifecycleCounts[value]})
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search PO number..."
            className="w-full sm:w-64"
          />
          <Input
            value={supplierSearch}
            onChange={(e) => {
              setSupplierSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by supplier..."
            className="w-full sm:w-56"
          />

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'ALL' ? '' as typeof statusFilter : v as typeof statusFilter); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {!user?.shopId && (
            <Select
              value={effectiveSelectedShopId}
              onValueChange={(v) => {
                setSelectedShopId(v);
                try {
                  sessionStorage.setItem('po:activeShopId', v);
                } catch {
                  /* sessionStorage unavailable — ignore */
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Select Plant" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.shopName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
          </Card>

          {/* Table */}
          <Card className="surface-1">
        {poQuery.isLoading ? (
          <LoadingSkeleton rows={6} columns={7} />
        ) : poQuery.isError ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-destructive">Failed to load purchase orders. Please try again.</p>
            <Button variant="outline" size="sm" onClick={() => poQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredPoList.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No purchase orders found"
            description="Create your first purchase order to get started."
            action={
              <Button variant="outline" onClick={() => navigate('/purchase-orders/new')} disabled={!canMutatePo}>
                <Plus className="h-4 w-4" /> New Order
              </Button>
            }
          />
        ) : (
          <>
            <Table className="text-xs [&_th]:h-8 [&_th]:px-2 [&_th]:py-1 [&_th]:text-[11px] [&_td]:px-2 [&_td]:py-1.5">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>PO Number</TableHead>
                  <TableHead className="w-[112px]">PO Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="w-12 text-center">Items</TableHead>
                  <TableHead className="w-28 text-right">Gross Amount</TableHead>
                  <TableHead className="w-36">Status</TableHead>
                  <TableHead className="w-10 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatedTableBody pageKey={page}>
                {filteredPoList.map((po) => (
                  <TableRow key={po.id} className="hover:bg-slate-50/80">
                    <TableCell className="max-w-[200px] truncate font-medium font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => setDetailId(po.id)}
                        className="truncate text-left text-primary hover:underline"
                      >
                        {po.poNumber}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <div className="flex flex-col leading-tight">
                        <span>{new Date(po.poDate).toLocaleDateString()}</span>
                        {(() => {
                          const status = po.lifecycleStatus ?? po.status;
                          const poDate = new Date(po.poDate);
                          const today = new Date();
                          const isOverdue = status === 'CONFIRMED' && poDate < today;
                          if (!isOverdue) return null;
                          const diffDays = Math.max(
                            1,
                            Math.ceil((today.getTime() - poDate.getTime()) / (1000 * 60 * 60 * 24)),
                          );
                          return <span className="text-[10px] text-amber-700">Overdue by {diffDays} day(s)</span>;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">{po.supplier}</TableCell>
                    <TableCell className="text-center tabular-nums">{po.items?.length ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                      {formatCurrency(purchaseOrderTotals(po, productMap).grossTotal)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={po.lifecycleStatus ?? po.status} compact />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailId(po.id)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPoPdf(po)}>
                            <Download className="mr-2 h-4 w-4" /> Download PDF
                          </DropdownMenuItem>

                          {(po.lifecycleStatus ?? po.status) !== 'CANCELLED' && (
                            <DropdownMenuItem
                              disabled={!canSendPoEmail || sendMut.isPending}
                              onClick={() => handleResendToSupplier(po)}
                            >
                              <Send className="mr-2 h-4 w-4" /> Resend email
                            </DropdownMenuItem>
                          )}

                          {po.status === 'DRAFT' && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(po)} disabled={!canMutatePo}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setConfirmState({ type: 'confirm', id: po.id, poNumber: po.poNumber })} disabled={!canMutatePo}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={!canMutatePo}
                                onClick={() =>
                                  setCancelDialog({
                                    id: po.id,
                                    poNumber: po.poNumber,
                                  })
                                }
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Cancel
                              </DropdownMenuItem>
                            </>
                          )}

                          {po.status === 'CONFIRMED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleConvertToGR(po.id)}>
                                <ArrowRightFromLine className="mr-2 h-4 w-4" /> Convert to GR
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={!canMutatePo}
                                onClick={() =>
                                  setCancelDialog({
                                    id: po.id,
                                    poNumber: po.poNumber,
                                  })
                                }
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </AnimatedTableBody>
            </Table>
            <Separator />
            <DataTablePagination
              page={page}
              totalPages={Math.max(1, Math.ceil((poTotal ?? filteredPoList.length) / PAGE_SIZE))}
              total={poTotal ?? filteredPoList.length}
              limit={PAGE_SIZE}
              onPageChange={setPage}
              onLimitChange={() => {}}
              className="py-2"
            />
          </>
        )}
          </Card>
      </div>

      {/* ---- EDIT SHEET ---- */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setEditingPO(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto border-l sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Edit Purchase Order</SheetTitle>
            <SheetDescription>
              {editingPO ? `Editing ${editingPO.poNumber}` : 'Update purchase order'}
            </SheetDescription>
          </SheetHeader>
          {purchaseOrderForm}
        </SheetContent>
      </Sheet>

      {/* ---- DETAIL DIALOG ---- */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5" />
                  {detailPO?.poNumber ?? 'Purchase Order'}
                </DialogTitle>
                <DialogDescription>Purchase order details and line items</DialogDescription>
              </div>
              {detailPO && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportPoDetail(detailPO)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-200 text-emerald-800"
                    onClick={() => handleDownloadPoPdf(detailPO)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  {(detailPO.lifecycleStatus ?? detailPO.status) !== 'CANCELLED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canSendPoEmail || sendMut.isPending}
                      onClick={() => handleResendToSupplier(detailPO)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {sendMut.isPending ? 'Sending…' : 'Resend email'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <LoadingSkeleton rows={4} columns={4} />
          ) : detailPO ? (
            <div className="space-y-4">
              <P2PFlowTimeline title="P2P progress" steps={lifecycleSteps(detailPO as PurchaseOrder)} />
              <DocumentEmailHistoryPanel
                summary={emailHistoryQuery.data?.summary}
                history={emailHistoryQuery.data?.history}
                isLoading={emailHistoryQuery.isLoading}
              />
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">PO Date</p>
                  <p className="font-medium">{new Date(detailPO.poDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="font-medium">{detailPO.supplier}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={detailPO.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gross Amount</p>
                  <p className="font-bold">{formatCurrency(detailTotals?.grossTotal ?? detailPO.totalValue)}</p>
                </div>
              </div>

              {detailRemarks && (
                <div>
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm">{detailRemarks}</p>
                </div>
              )}

              <Separator />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Order Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Tax %</TableHead>
                    <TableHead className="text-right">Gross Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailPO.items.map((item, i) => {
                    const taxPercent = effectivePoLineTaxPercent(
                      item.productId,
                      taxPercentForProduct(detailTotals?.document.lineItemTaxes, item.productId),
                      productMap,
                    );
                    const line = computePoLineAmounts({
                      orderQty: item.orderQty,
                      rate: item.rate,
                      taxPercent,
                    });
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <span className="font-medium">{item.product?.productCode}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{item.product?.description}</span>
                        </TableCell>
                        <TableCell className="text-right">{item.currentStock}</TableCell>
                        <TableCell className="text-right font-medium">{item.orderQty}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                        <TableCell className="text-right">{taxPercent}%</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(line.lineTotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="text-right text-xs text-muted-foreground">
                      Subtotal (Excl. GST)
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(detailTotals?.subtotal ?? detailPO.totalValue)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} className="text-right text-xs text-muted-foreground">
                      GST / Tax
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(detailTotals?.taxTotal ?? 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-semibold">Gross Amount</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(detailTotals?.grossTotal ?? detailPO.totalValue)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>

              {Array.isArray((detailPO as PurchaseOrder).receiptProgress) &&
                (detailPO as PurchaseOrder).receiptProgress!.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-sm font-semibold">Receipt progress</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Ordered</TableHead>
                            <TableHead className="text-right">Received</TableHead>
                            <TableHead className="text-right">Remaining</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailPO as PurchaseOrder).receiptProgress!.map((row) => {
                            const productCode =
                              row.productCode ??
                              detailPO.items.find((item) => item.productId === row.productId)?.product
                                ?.productCode;
                            return (
                            <TableRow key={row.productId}>
                              <TableCell className="font-mono text-xs">
                                {productCode?.trim() || '—'}
                              </TableCell>
                              <TableCell className="text-right">{Number(row.orderedQty)}</TableCell>
                              <TableCell className="text-right">{Number(row.receivedQty)}</TableCell>
                              <TableCell className="text-right font-medium">{Number(row.remainingQty)}</TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

              {(() => {
                const lifecycle = detailPO.lifecycleStatus ?? detailPO.status;
                const isCancelled =
                  lifecycle === 'CANCELLED' || detailPO.status === 'CANCELLED';
                const canConvert =
                  !isCancelled &&
                  (detailPO.status === 'CONFIRMED' ||
                    detailPO.status === 'DRAFT' ||
                    lifecycle === 'CONFIRMED');
                const canCancel =
                  !isCancelled &&
                  (detailPO.status === 'CONFIRMED' ||
                    detailPO.status === 'DRAFT' ||
                    lifecycle === 'CONFIRMED' ||
                    lifecycle === 'DRAFT');
                if (!canCancel && !canConvert) return null;
                return (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {canCancel ? (
                        <Button
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setCancelDialog({
                              id: detailPO.id,
                              poNumber: detailPO.poNumber,
                            })
                          }
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel PO
                        </Button>
                      ) : (
                        <span />
                      )}
                      {canConvert ? (
                        <Button
                          onClick={() => {
                            setDetailId(null);
                            handleConvertToGR(detailPO.id);
                          }}
                        >
                          <ArrowRightFromLine className="h-4 w-4" />
                          Convert to Goods Receipt
                        </Button>
                      ) : null}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ---- CONFIRM DIALOGS ---- */}
      <ConfirmDialog
        open={confirmState?.type === 'confirm'}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Confirm Purchase Order"
        description={`Are you sure you want to confirm ${confirmState?.poNumber ?? 'this order'}? This will move it to confirmed status.`}
        confirmLabel="Confirm Order"
        onConfirm={() => confirmState && handleConfirm(confirmState.id)}
        loading={confirmMut.isPending}
      />

      <ConfirmDialog
        open={!!cancelDialog}
        onOpenChange={(open) => !open && setCancelDialog(null)}
        title="Cancel Purchase Order"
        description={`Are you sure you want to cancel ${cancelDialog?.poNumber ?? 'this order'}? This cannot be undone.`}
        confirmLabel="Cancel Order"
        variant="destructive"
        onConfirm={handleCancelPo}
        loading={cancelMut.isPending}
      />
      <ConfirmDialog
        open={formCancelConfirmOpen}
        onOpenChange={(open) => !open && setFormCancelConfirmOpen(false)}
        title="Discard changes?"
        description="All the data you have entered will be lost. Are you sure you want to cancel?"
        confirmLabel="Yes, discard"
        variant="destructive"
        onConfirm={() => {
          form.reset();
          setFormCancelConfirmOpen(false);
          setSheetOpen(false);
          if (location.pathname === '/purchase-orders/new') {
            navigate('/purchase-orders');
          }
        }}
      />
    </AppLayout>
  );
}
