import { EventClassification } from '@prisma/client';

/**
 * Dependency-free payload schema descriptor. We deliberately avoid adding a
 * validation library (zod) as a new dependency; this covers the field-shape
 * contract the platform needs. See docs/event-platform/schema-registry.md.
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'uuid' | 'object' | 'array' | 'any';

export interface FieldSpec {
  type: FieldType;
  optional?: boolean;
}

export type PayloadSchema = Record<string, FieldSpec>;

/** Retention class governs TTL-cleanup. See docs/event-platform/retention-and-versioning.md. */
export type RetentionClass = 'short-op' | 'standard' | 'audit' | 'permanent' | 'ai' | 'marketing';

export interface EventRegistryEntry {
  eventType: string;
  eventVersion: number;
  /** The single owner module of this fact. Exactly one owner per eventType. */
  ownerModule: string;
  /** The producing service/method, for documentation + tracing. */
  producer: string;
  /** Declared consumers; adding one never changes producers. */
  consumers: string[];
  classification: EventClassification;
  payloadSchema: PayloadSchema;
  retention: RetentionClass;
  description: string;
}

const UUID: FieldSpec = { type: 'uuid' };

/**
 * The Event Ownership + Schema Registry, keyed `eventType@eventVersion`.
 * OutboxService.emit validates against this and rejects the caller's
 * transaction on an unregistered or malformed event.
 *
 * Step 1 seeds a representative set; the remaining Phase-1 events (PO approved,
 * GR created, RFQ/quotation, payments, subscription expiry, backup failure,
 * password events, new-device login) are registered as their producers are
 * migrated in later steps.
 */
export const EVENT_REGISTRY: EventRegistryEntry[] = [
  {
    eventType: 'purchase-order.created',
    eventVersion: 1,
    ownerModule: 'purchase-orders',
    producer: 'PurchaseOrderService.create',
    consumers: ['notification-engine'],
    classification: EventClassification.OPERATIONAL,
    payloadSchema: {
      purchaseOrderId: UUID,
      poNumber: { type: 'string' },
      supplierId: { type: 'uuid', optional: true },
      supplierName: { type: 'string' },
      totalAmount: { type: 'number' },
      createdBy: { type: 'uuid', optional: true },
    },
    retention: 'standard',
    description: 'A purchase order was created and awaits downstream reaction.',
  },
  {
    eventType: 'goods-receipt.created',
    eventVersion: 1,
    ownerModule: 'goods-receipts',
    producer: 'GoodsReceiptsService.create',
    consumers: ['notification-engine'],
    classification: EventClassification.OPERATIONAL,
    payloadSchema: {
      goodsReceiptId: UUID,
      grNumber: { type: 'string' },
      poNumber: { type: 'string', optional: true },
      supplierName: { type: 'string' },
      shopId: UUID,
      createdBy: { type: 'uuid', optional: true },
    },
    retention: 'standard',
    description: 'A goods receipt was posted; notify the procurement/inventory team.',
  },
  {
    eventType: 'stock.fell-below-minimum',
    eventVersion: 1,
    ownerModule: 'goods-issues',
    producer: 'GoodsIssuesService.post',
    consumers: ['notification-engine'],
    classification: EventClassification.OPERATIONAL,
    payloadSchema: {
      productId: UUID,
      productName: { type: 'string' },
      shopId: UUID,
      critical: { type: 'boolean' },
      currentStock: { type: 'number' },
    },
    retention: 'standard',
    description: 'A goods issue pushed a product at/below its plant minimum (crossing only).',
  },
  {
    eventType: 'quotation.received',
    eventVersion: 1,
    ownerModule: 'supplier-portal',
    producer: 'SupplierPortalService.submitQuote',
    consumers: ['notification-engine'],
    classification: EventClassification.OPERATIONAL,
    payloadSchema: {
      quoteNumber: { type: 'string' },
      rfqId: UUID,
      rfqNumber: { type: 'string', optional: true },
      supplierName: { type: 'string' },
    },
    retention: 'standard',
    description: 'A supplier submitted a quotation/bid against an RFQ.',
  },
  {
    eventType: 'approval.requested',
    eventVersion: 1,
    ownerModule: 'approvals',
    producer: 'ApprovalService.createApprovalRequest',
    consumers: ['notification-engine'],
    classification: EventClassification.OPERATIONAL,
    payloadSchema: {
      approvalId: UUID,
      approvalType: { type: 'string' },
      documentNumber: { type: 'string', optional: true },
      description: { type: 'string', optional: true },
      assignedToUserId: UUID,
    },
    retention: 'standard',
    description: 'An approval request was created and awaits a specific approver.',
  },
  {
    eventType: 'approval.approved',
    eventVersion: 1,
    ownerModule: 'approvals',
    producer: 'ApprovalService.approve',
    consumers: ['notification-engine'],
    classification: EventClassification.OPERATIONAL,
    payloadSchema: {
      approvalId: UUID,
      approvalType: { type: 'string' },
      documentNumber: { type: 'string', optional: true },
      requestedByUserId: UUID,
    },
    retention: 'standard',
    description: 'An approval request was approved; notify the requester.',
  },
  {
    eventType: 'approval.rejected',
    eventVersion: 1,
    ownerModule: 'approvals',
    producer: 'ApprovalService.reject',
    consumers: ['notification-engine'],
    classification: EventClassification.OPERATIONAL,
    payloadSchema: {
      approvalId: UUID,
      approvalType: { type: 'string' },
      documentNumber: { type: 'string', optional: true },
      requestedByUserId: UUID,
      rejectionReason: { type: 'string', optional: true },
    },
    retention: 'standard',
    description: 'An approval request was rejected; notify the requester.',
  },
  {
    eventType: 'auth.otp-requested',
    eventVersion: 1,
    ownerModule: 'auth',
    producer: 'AuthService.requestOtp',
    consumers: ['notification-engine'],
    classification: EventClassification.AUTHENTICATION,
    payloadSchema: {
      userId: UUID,
      channelHint: { type: 'string', optional: true },
      phoneMasked: { type: 'string', optional: true },
      emailMasked: { type: 'string', optional: true },
      purpose: { type: 'string' },
      // The live OTP value is NEVER stored in the payload; it is delivered
      // out-of-band to the provider render step. See security model.
      otpRef: { type: 'string' },
    },
    retention: 'short-op',
    description: 'A one-time password was requested; deliver via WhatsApp with email fallback.',
  },
  {
    eventType: 'inventory-lot.expiring',
    eventVersion: 1,
    ownerModule: 'stock',
    producer: 'ExpiryScanProcessor.scanCompanyExpiry',
    consumers: ['notification-engine'],
    classification: EventClassification.OPERATIONAL,
    payloadSchema: {
      lotId: UUID,
      lotNumber: { type: 'string' },
      productId: UUID,
      productName: { type: 'string' },
      shopId: UUID,
      expiryDate: { type: 'string' },
      daysLeft: { type: 'number' },
      qtyOnHand: { type: 'string' },
      unitCost: { type: 'string', optional: true },
      threshold: { type: 'number' },
    },
    retention: 'standard',
    description: 'A lot is expiring within the warning threshold (7 or 3 days).',
  },
  {
    eventType: 'inventory-lot.expiring-critical',
    eventVersion: 1,
    ownerModule: 'stock',
    producer: 'ExpiryScanProcessor.scanCompanyExpiry',
    consumers: ['notification-engine'],
    classification: EventClassification.OPERATIONAL,
    payloadSchema: {
      lotId: UUID,
      lotNumber: { type: 'string' },
      productId: UUID,
      productName: { type: 'string' },
      shopId: UUID,
      expiryDate: { type: 'string' },
      daysLeft: { type: 'number' },
      qtyOnHand: { type: 'string' },
      unitCost: { type: 'string', optional: true },
      threshold: { type: 'number' },
    },
    retention: 'standard',
    description: 'A lot is expiring critically (1 day remaining).',
  },
  {
    eventType: 'inventory-lot.expired',
    eventVersion: 1,
    ownerModule: 'stock',
    producer: 'ExpiryScanProcessor.scanCompanyExpiry',
    consumers: ['notification-engine'],
    classification: EventClassification.OPERATIONAL,
    payloadSchema: {
      lotId: UUID,
      threshold: { type: 'number' },
    },
    retention: 'standard',
    description: 'A lot has expired and been auto-blocked.',
  },
];

const registryKey = (eventType: string, eventVersion: number) => `${eventType}@${eventVersion}`;

const REGISTRY_INDEX: ReadonlyMap<string, EventRegistryEntry> = new Map(
  EVENT_REGISTRY.map((e) => [registryKey(e.eventType, e.eventVersion), e]),
);

export function lookupEvent(eventType: string, eventVersion: number): EventRegistryEntry | undefined {
  return REGISTRY_INDEX.get(registryKey(eventType, eventVersion));
}
