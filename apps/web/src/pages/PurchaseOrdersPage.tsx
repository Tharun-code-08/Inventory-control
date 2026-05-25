import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { PageHeader, SearchInput, ConfirmDialog, DataTablePagination, LoadingSkeleton, EmptyState, P2PFlowTimeline, type P2PStep } from '@/components/shared';

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
  useConfirmPurchaseOrder,
  useCancelPurchaseOrder,
  useSendPurchaseOrder,
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
import { downloadPurchaseOrderPdf } from '@/lib/purchase-order-pdf';
import { DEPARTMENT_OPTIONS } from '@/lib/po-form-options';
import { PoLogisticsTaxFields } from '@/components/purchase-orders/PoLogisticsTaxFields';
import type { PoDocumentMeta } from '@/lib/po-document';
import {
  computePoLineAmounts,
  numPo,
  sumPoLineTotals,
  taxPercentForProduct,
} from '@/lib/po-line-calculations';
import { csvDate, csvMoney, exportModuleCsv } from '@/lib/module-csv';
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

const poItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  rfqItemId: z.string().optional(),
  currentStock: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0),
  suggestedQty: z.coerce.number().min(0),
  orderQty: z.coerce.number().positive('Order qty must be > 0'),
  rate: z.coerce.number().positive('Rate must be > 0'),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
});

const poFormSchema = z.object({
  poDate: z.string().min(1, 'Date is required'),
  priority: z.string().optional(),
  paymentTerms: z.string().optional(),
  supplier: z.string().min(1, 'Supplier is required'),
  deliveryPlantId: z.string().min(1, 'Delivery plant is required'),
  storageLocationId: z.string().min(1, 'Storage location is required'),
  deliveryAddress: z.string().optional(),
  remarks: z.string().optional(),
  requisitioner: z.string().optional(),
  department: z.string().optional(),
  shipVia: z.string().optional(),
  fob: z.string().optional(),
  shippingTerms: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'Add at least one item'),
});

type POFormValues = z.infer<typeof poFormSchema>;

const PAGE_SIZE = 10;
const CREATE_SUPPLIER_OPTION = '__create_supplier__';
/** Compact listboxes in the PO create sheet */
const PO_SELECT_TRIGGER = 'h-8 min-h-8 py-1 px-2 text-xs';
const PO_SELECT_CONTENT = 'max-h-52 text-xs';

function tomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PurchaseOrdersPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const functionalCookiesEnabled = useCookieConsentStore((state) => state.preferences.functional);
  const canMutatePo = hasPermission(user, 'purchase_order:create');
  const canSendPoEmail = hasAnyPermission(user, 'purchase_order:create', 'purchase_order:approve');
  const [selectedShopId, setSelectedShopId] = useState('');
  const { data: shops = [] } = useShops();
  const shopId = resolvePreferredOrgId(
    shops.map((shop) => shop.id),
    user?.shopId,
    selectedShopId,
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
  const [confirmState, setConfirmState] = useState<{ type: 'confirm' | 'cancel'; id: string; poNumber: string } | null>(null);

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
      ALL: poList.length,
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
  }, [poList]);

  const detailQuery = usePurchaseOrder(detailId ?? '');
  const detailPO = detailId ? detailQuery.data : null;

  const productsQuery = useProducts({ shopId: shopId || undefined, isActive: true, limit: 100, page: 1 });
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
  const products = useMemo(() => {
    const raw = productsQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Product[];
    if (typeof raw === 'object' && 'rows' in raw) return (raw as { rows: Product[] }).rows;
    if (typeof raw === 'object' && 'data' in raw) return (raw as { data: Product[] }).data;
    return [];
  }, [productsQuery.data]);

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
      { header: 'Total Value', value: (po) => csvMoney(po.totalValue) },
      { header: 'Remarks', value: (po) => po.remarks ?? '' },
    ]);
    if (ok) toast.success('Purchase orders exported');
    else toast.error('No purchase orders to export');
  }, [filteredPoList, rfqMap]);

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
        { header: 'Line Value', value: ({ item }) => csvMoney(item.lineValue) },
        { header: 'Current Stock', value: ({ item }) => item.currentStock },
        { header: 'Min Stock', value: ({ item }) => item.minStock },
        { header: 'Suggested Qty', value: ({ item }) => item.suggestedQty },
        { header: 'Remarks', value: ({ po: current }) => current.remarks ?? '' },
      ]);
      if (ok) toast.success('Purchase order exported');
      else toast.error('No PO lines to export');
    },
    [rfqMap],
  );

  // ---- mutations ----
  const createMut = useCreatePurchaseOrder();
  const confirmMut = useConfirmPurchaseOrder();
  const cancelMut = useCancelPurchaseOrder();
  const sendMut = useSendPurchaseOrder();

  // ---- form ----
  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      poDate: tomorrowDateString(),
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

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' }) ?? [];
  const selectedDeliveryPlantId = form.watch('deliveryPlantId');
  const selectedStorageLocationId = form.watch('storageLocationId');
  const resolvedDeliveryPlantId =
    selectedDeliveryPlantId || shopId || (shops.length === 1 ? shops[0]?.id : '') || '';
  const { data: storageLocations = [] } = useStorageLocations(resolvedDeliveryPlantId || undefined);
  const resolvedStorageLocationId =
    selectedStorageLocationId ||
    (storageLocations.length === 1 ? storageLocations[0]?.id : '') ||
    '';
  const selectedRfq = sourceRfqId ? rfqMap.get(sourceRfqId) : undefined;
  const rfqPosRemaining = selectedRfq?.fulfillment?.posRemaining ?? null;
  const canAddLineItems = Boolean(resolvedDeliveryPlantId && resolvedStorageLocationId) && (rfqPosRemaining == null || rfqPosRemaining > 0);

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

  const targetProductShopId = selectedDeliveryPlantId || shopId || '';
  // Multi-plant: a product is "selectable for this PO" if it's assigned to
  // the delivery plant. We still fall back to all products when no plant is
  // chosen (so the dropdown isn't empty before the user picks one).
  const selectableProducts = useMemo(
    () =>
      targetProductShopId
        ? products.filter((p) => p.plants.some((plant) => plant.shopId === targetProductShopId))
        : products,
    [products, targetProductShopId],
  );
  const productMap = useMemo(() => new Map(selectableProducts.map((p) => [p.id, p])), [selectableProducts]);
  const lineTotals = sumPoLineTotals(watchedItems);

  const openCreate = useCallback(() => {
    setEditingPO(null);
    form.reset({
      poDate: tomorrowDateString(),
        priority: 'Medium',
        paymentTerms: 'Net 30',
      supplier: '',
        deliveryPlantId: shopId ?? '',
        storageLocationId: '',
        deliveryAddress: resolvePoDeliveryAddress(shops.find((s) => s.id === shopId)),
      remarks: '',
      ...defaultPoLogisticsFields(user?.name),
      items: [defaultPoLineItem()],
    });
    setSheetOpen(true);
    setSourceType('DIRECT');
    setSourceRfqId('');
    setSourceContractId('');
  }, [form, shopId, shops, user?.name]);

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
  };

  const prefillAppliedRef = useRef(false);
  const newRouteInitializedRef = useRef(false);

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
      poDate: tomorrowDateString(),
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
      items: [
        {
          productId: prefill.productId,
          currentStock: prefill.currentStock,
          minStock: prefill.minStockLevel,
          suggestedQty: prefill.suggestedQty,
          orderQty: prefill.orderQty,
          rate: prefill.rate,
          taxPercent: '',
        },
      ],
    });
    setSheetOpen(true);
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
        ...logisticsFieldsFromDocumentWithPayment(docMeta, 'Net 30'),
        items: po.items.map((it) => ({
          productId: it.productId,
          rfqItemId: (it as { rfqItemId?: string | null }).rfqItemId ?? undefined,
          currentStock: it.currentStock,
          minStock: it.minStock,
          suggestedQty: it.suggestedQty,
          orderQty: it.orderQty,
          rate: it.rate,
          taxPercent: taxPercentFromDocument(docMeta, it.productId),
        })),
      });
      setSheetOpen(true);
    },
    [form, shops],
  );

  function handleDownloadPoPdf(po: PurchaseOrder) {
    const supplier = suppliers.find((s) => s.supplierName === po.supplier);
    const shop = shops.find((s) => s.id === po.shopId);
    const document = resolvePoDocumentForPdf({
      po,
      company: companies[0],
      supplier,
      shop,
    });
    try {
      downloadPurchaseOrderPdf(po, {
        document,
        buyerCompanyName: companies[0]?.companyName,
      });
      toast.success('PDF downloaded');
    } catch {
      toast.error('Could not generate PDF');
    }
  }

  // Auto-fill product fields when product selection changes
  function handleProductChange(idx: number, productId: string) {
    const p = productMap.get(productId);
    if (!p) return;
    const plantId = targetProductShopId || shopId;
    const plantStock = plantId ? p.stockByShop?.[plantId] : undefined;
    const currentStock = plantStock ?? p.currentStock ?? 0;
    const plantAssignment = plantId ? getProductPlant(p, plantId) : undefined;
    const minStock = plantAssignment?.minStockLevel ?? 0;
    const suggestedQty = Math.max(0, minStock - currentStock);
    const defaultQty = suggestedQty > 0 ? suggestedQty : 1;

    form.setValue(`items.${idx}.currentStock`, currentStock, { shouldDirty: true });
    form.setValue(`items.${idx}.minStock`, minStock, { shouldDirty: true });
    form.setValue(`items.${idx}.suggestedQty`, suggestedQty, { shouldDirty: true });
    form.setValue(`items.${idx}.orderQty`, defaultQty, { shouldDirty: true });
    form.setValue(`items.${idx}.rate`, p.purchasePrice ?? 0, { shouldDirty: true });
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
    const err = e as {
      response?: {
        status?: number;
        data?: { error?: { message?: string }; message?: string | string[] };
      };
      message?: string;
    };
    if (err.response?.status === 502) {
      return (
        err.message ??
        'Backend API is unavailable. Run npm run dev:api in retail-ims and ensure cloudflared routes to port 3000.'
      );
    }
    if (err.response?.status === 504) {
      return err.message ?? 'Request timed out while sending email. Try again—the PDF may still be generating.';
    }
    const nested = err.response?.data?.error?.message;
    if (nested) return nested;
    const bodyMsg = err.response?.data?.message;
    if (Array.isArray(bodyMsg)) return bodyMsg.join(', ');
    if (typeof bodyMsg === 'string') return bodyMsg;
    return err.message;
  }

  function isApiNotFound(e: unknown): boolean {
    const err = e as { response?: { status?: number }; message?: string };
    if (err.response?.status === 404) return true;
    const msg = apiErrorMessage(e) ?? '';
    return /cannot\s+post/i.test(msg);
  }

  function rejectsSendToSupplierOnCreate(e: unknown): boolean {
    const msg = apiErrorMessage(e) ?? '';
    return msg.includes('sendToSupplier');
  }

  async function handleSubmit(values: POFormValues, sendNow = false) {
    try {
      const resolvedShopId = values.deliveryPlantId || shopId;
      if (!resolvedShopId) {
        toast.error('Select a delivery plant');
        return;
      }
      const deliveryShop = shops.find((s) => s.id === resolvedShopId);
      const payload = mapPoFormToCreatePayload({
        values,
        resolvedShopId,
        shop: deliveryShop,
        sourceType,
        sourceRfqId,
        sourceContractId,
      });

      if (sendNow) {
        const supplier = suppliers.find((s) => s.supplierName === values.supplier);
        if (!supplier?.email) {
          toast.error('Add an email address to the supplier before sending.');
          return;
        }
      }

      const idempotencyKey =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `po-${Date.now()}`;
      const createBase = { ...payload, idempotencyKey };

      let result: Awaited<ReturnType<typeof createMut.mutateAsync>> | undefined;

      if (sendNow) {
        try {
          result = await createMut.mutateAsync({ ...createBase, sendToSupplier: true });
          toast.success(`Purchase order ${result.poNumber} emailed to supplier`);
          setSheetOpen(false);
          form.reset();
          setDetailId(result.id);
          return;
        } catch (e: unknown) {
          if (!rejectsSendToSupplierOnCreate(e)) {
            throw e;
          }
        }
      }

      result = await createMut.mutateAsync(createBase);

      if (sendNow) {
        if (!result.id) {
          toast.error('Purchase order was created but could not be sent.');
          return;
        }
        try {
          await sendMut.mutateAsync(result.id);
          toast.success(`Purchase order ${result.poNumber} emailed to supplier`);
        } catch (sendErr: unknown) {
          if (isApiNotFound(sendErr)) {
            toast.warning(
              `Purchase order ${result.poNumber} was saved as draft, but email could not be sent. Redeploy the API (POST /purchase-orders/:id/send) and try again from the PO detail view.`,
            );
          } else {
            toast.error(apiErrorMessage(sendErr) ?? 'Purchase order saved, but email failed');
          }
        }
      } else {
        toast.success(`Purchase order ${result.poNumber} saved as draft`);
      }
      setSheetOpen(false);
      form.reset();
      setDetailId(result.id);
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e) ?? 'Failed to create purchase order');
    }
  }

  const submitDraft = form.handleSubmit((values) => handleSubmit(values, false));
  const submitSend = form.handleSubmit((values) => handleSubmit(values, true));

  async function handleResendToSupplier(po: PurchaseOrder) {
    try {
      const result = await sendMut.mutateAsync(po.id) as {
        to?: string;
        pdfAttached?: boolean;
      };
      const to = result?.to?.trim();
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

  async function handleCancel(id: string) {
    try {
      await cancelMut.mutateAsync(id);
      toast.success('Purchase order cancelled');
    } catch {
      toast.error('Failed to cancel purchase order');
    }
    setConfirmState(null);
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
    if (!targetProductShopId) return;
    const items = form.getValues('items');
    items.forEach((item, idx) => {
      if (item.productId && !productMap.has(item.productId)) {
        form.setValue(`items.${idx}.productId`, '');
        form.setValue(`items.${idx}.currentStock`, 0);
        form.setValue(`items.${idx}.minStock`, 0);
        form.setValue(`items.${idx}.suggestedQty`, 0);
        form.setValue(`items.${idx}.orderQty`, 0);
        form.setValue(`items.${idx}.rate`, 0);
      }
    });
  }, [form, productMap, targetProductShopId]);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
  }

  function lifecycleSteps(po: PurchaseOrder): P2PStep[] {
    const status = po.lifecycleStatus ?? po.status;
    return [
      { key: 'po', label: 'PO confirmed', state: status === 'DRAFT' ? 'active' : 'done' },
      {
        key: 'partial',
        label: 'Partial GR',
        state: status === 'PARTIALLY_RECEIVED' ? 'active' : status === 'FULLY_RECEIVED' ? 'done' : 'todo',
      },
      { key: 'full', label: 'PO fully received', state: status === 'FULLY_RECEIVED' ? 'done' : 'todo' },
      { key: 'invoice', label: 'Invoice & payable', state: 'todo' },
      { key: 'payment', label: 'Payment tracking', state: 'todo' },
    ];
  }

  return (
    <AppLayout>
      <div className={createOnly ? 'create-page-shell p-4 sm:p-6' : ''}>
        <PageHeader
          title={createOnly ? 'Create Purchase Order' : 'Purchase Orders'}
          description={createOnly ? 'Fill in details to create a new purchase order' : 'Manage purchase order documents'}
        >
          {createOnly ? (
            <Button variant="outline" onClick={() => navigate('/purchase-orders')} className="w-full sm:w-auto">
              Back
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleExportPoList} className="w-full sm:w-auto">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={() => navigate('/purchase-orders/new')} className="premium-button w-full border-0 text-white sm:w-auto" disabled={!canMutatePo}>
                <Plus className="h-4 w-4" />
                Create PO
              </Button>
            </>
          )}
        </PageHeader>

      {!createOnly && (
        <>
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
            <Select value={selectedShopId} onValueChange={setSelectedShopId}>
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
                  <TableHead className="w-[88px]">Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="w-12 text-center">Items</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-36">Status</TableHead>
                  <TableHead className="w-10 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPoList.map((po) => (
                  <TableRow key={po.id} className="hover:bg-slate-50/80">
                    <TableCell className="max-w-[200px] truncate font-medium font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => setDetailId(po.id)}
                        className="truncate text-left text-indigo-600 hover:underline"
                      >
                        {po.poNumber}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(po.poDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">{po.supplier}</TableCell>
                    <TableCell className="text-center tabular-nums">{po.items?.length ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                      {po.totalValue != null ? formatCurrency(po.totalValue) : '—'}
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
                                onClick={() => setConfirmState({ type: 'cancel', id: po.id, poNumber: po.poNumber })}
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
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
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
        </>
      )}

      {/* ---- CREATE / EDIT SHEET ---- */}
      <Sheet
        open={createOnly ? true : sheetOpen}
        onOpenChange={(open) => {
          if (!createOnly) {
            setSheetOpen(open);
          }
          if (!open) {
            navigate('/purchase-orders');
          }
        }}
      >
        <SheetContent side="right" className={cn("w-full overflow-y-auto", createOnly ? "border-l-0 sm:w-full sm:max-w-none" : "border-l sm:max-w-3xl")}>
          <SheetHeader>
            <SheetTitle>{editingPO ? 'Edit Purchase Order' : 'New Purchase Order'}</SheetTitle>
            <SheetDescription>
              {editingPO ? `Editing ${editingPO.poNumber}` : 'Create a new purchase order'}
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={submitDraft}
            className="mt-6 space-y-6"
          >
            {!editingPO && (
              <div className="grid gap-3 sm:grid-cols-3">
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
                          form.setValue('items', [defaultPoLineItem()]);
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
                              currentStock: 0,
                              minStock: 0,
                              suggestedQty: Number(line.remainingQty ?? 0),
                              orderQty: Number(line.remainingQty ?? 0),
                              rate: Number(rfqItem?.product?.purchasePrice ?? 0),
                              taxPercent: '',
                            },
                          ];
                        });
                        form.setValue('items', nextItems.length > 0 ? nextItems : [defaultPoLineItem()]);
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
                        form.setValue(
                          'items',
                          ((contract as { items?: Array<{ productId?: string; quantity?: number; unitPrice?: number }> }).items ?? []).map(
                            (it) => ({
                              productId: it.productId ?? '',
                              currentStock: 0,
                              minStock: 0,
                              suggestedQty: Number(it.quantity ?? 0),
                              orderQty: Number(it.quantity ?? 0),
                              rate: Number(it.unitPrice ?? 0),
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
              </div>
            )}

            {/* Order details + delivery */}
            <div className="space-y-2 rounded-lg border border-slate-200/90 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
              <Label className="text-sm font-semibold">Order Details & Delivery</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Delivery Plant *</Label>
                  <Controller
                    control={form.control}
                    name="deliveryPlantId"
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
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
                  <Label className="text-xs">Storage Location *</Label>
                  <Controller
                    control={form.control}
                    name="storageLocationId"
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
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
                          <SelectItem value={CREATE_SUPPLIER_OPTION} className="font-medium text-indigo-700">
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
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="poDate" className="text-xs">Delivery Date</Label>
                  <Input
                    id="poDate"
                    type="date"
                    min={tomorrowDateString()}
                    className="h-8 text-xs"
                    {...form.register('poDate')}
                  />
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
              </div>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                rows={2}
                placeholder="Optional notes…"
                {...form.register('remarks')}
              />
            </div>

            <Separator />

            {/* Items */}
            <div>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-base">Line Items</Label>
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
              </div>
              {!canAddLineItems && (
                <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Select a delivery plant and storage location first to add line items.
                  {resolvedDeliveryPlantId && storageLocations.length === 0 && (
                    <span className="mt-1 block">
                      No storage locations found for this plant — add one under Settings → Storage.
                    </span>
                  )}
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
                      <TableHead className="w-[11%]">Category</TableHead>
                      <TableHead className="w-[10%] text-right">Order Qty</TableHead>
                      <TableHead className="w-[8%]">UOM</TableHead>
                      <TableHead className="w-[11%] text-right">Rate</TableHead>
                      <TableHead className="w-[8%] text-right">Tax %</TableHead>
                      <TableHead className="w-[12%] text-right">Line Value</TableHead>
                      <TableHead className="w-[7%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, idx) => {
                      const row = watchedItems[idx] ?? {};
                      const line = computePoLineAmounts(row);
                      const product = productMap.get(row.productId ?? '');

                      return (
                        <TableRow key={field.id}>
                          {/* Product select */}
                          <TableCell className="overflow-hidden">
                            <Controller
                              control={form.control}
                              name={`items.${idx}.productId`}
                              render={({ field: f }) => (
                                <Select
                                  value={f.value}
                                  onValueChange={(v) => {
                                    f.onChange(v);
                                    handleProductChange(idx, v);
                                  }}
                                >
                                  <SelectTrigger className={cn('h-8 w-full max-w-full text-xs', PO_SELECT_TRIGGER)}>
                                    <SelectValue placeholder="Product…" className="truncate" />
                                  </SelectTrigger>
                                  <SelectContent className={PO_SELECT_CONTENT}>
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

                          {/* Category (from product) */}
                          <TableCell>
                            <Input
                              readOnly
                              tabIndex={-1}
                              className="h-8 w-full truncate bg-muted text-xs"
                              value={product?.category ?? ''}
                              placeholder="—"
                            />
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
                              placeholder="0"
                              {...form.register(`items.${idx}.taxPercent`, {
                                onChange: () => form.trigger(`items.${idx}.taxPercent`),
                              })}
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
                        Subtotal
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatCurrency(lineTotals.subtotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} className="text-right text-xs text-muted-foreground">
                        Tax
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatCurrency(lineTotals.taxTotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} className="text-right font-semibold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatCurrency(lineTotals.grandTotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSheetOpen(false);
                  if (location.pathname === '/purchase-orders/new') {
                    navigate('/purchase-orders');
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending || sendMut.isPending || !canMutatePo}>
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
            </div>
          </form>
        </SheetContent>
      </Sheet>
      </div>

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
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
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
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="font-bold">{formatCurrency(detailPO.totalValue)}</p>
                </div>
              </div>

              {parsePoRemarks(detailPO.remarks).humanRemarks && (
                <div>
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm">{parsePoRemarks(detailPO.remarks).humanRemarks}</p>
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
                    <TableHead className="text-right">Line Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailPO.items.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <span className="font-medium">{item.product?.productCode}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{item.product?.description}</span>
                      </TableCell>
                      <TableCell className="text-right">{item.currentStock}</TableCell>
                      <TableCell className="text-right font-medium">{item.orderQty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.lineValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-semibold">Total</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(detailPO.totalValue)}</TableCell>
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
                          {(detailPO as PurchaseOrder).receiptProgress!.map((row) => (
                            <TableRow key={row.productId}>
                              <TableCell className="font-mono text-xs">{row.productId}</TableCell>
                              <TableCell className="text-right">{Number(row.orderedQty)}</TableCell>
                              <TableCell className="text-right">{Number(row.receivedQty)}</TableCell>
                              <TableCell className="text-right font-medium">{Number(row.remainingQty)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

              {detailPO.status === 'CONFIRMED' && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <Button onClick={() => { setDetailId(null); handleConvertToGR(detailPO.id); }}>
                      <ArrowRightFromLine className="h-4 w-4" />
                      Convert to Goods Receipt
                    </Button>
                  </div>
                </>
              )}
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
        open={confirmState?.type === 'cancel'}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Cancel Purchase Order"
        description={`Are you sure you want to cancel ${confirmState?.poNumber ?? 'this order'}? This action cannot be undone.`}
        confirmLabel="Cancel Order"
        variant="destructive"
        onConfirm={() => confirmState && handleCancel(confirmState.id)}
        loading={cancelMut.isPending}
      />
    </AppLayout>
  );
}
