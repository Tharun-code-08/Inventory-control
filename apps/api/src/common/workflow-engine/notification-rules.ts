import { AlertType, NotificationModule, NotificationPriority, RoleName } from '@prisma/client';

/**
 * Default, code-owned notification rules keyed by `eventType`. These are the
 * fallback the Workflow (Notification) Engine uses when no per-company
 * `NotificationRule` / `NotificationTemplate` row overrides them, so the engine
 * always has a deterministic default (see plan §"Data Model", rule 6/7).
 *
 * Phase 1 delivers the IN_APP channel only: every rule here resolves recipients
 * and renders an in-app notification. WhatsApp/Email channels and customer-facing
 * dunning are layered on in Phase 2 without touching this contract.
 */

/** How a rule resolves its recipients from an event. */
export type RecipientSpec =
  /** Fan out to every user holding any of these roles in the company. */
  | { readonly kind: 'roles'; readonly roles: readonly RoleName[] }
  /** Target the single user id carried on the event payload at `field`. */
  | { readonly kind: 'payloadUser'; readonly field: string };

export interface RenderedNotification {
  readonly alertType: AlertType;
  readonly priority: NotificationPriority;
  readonly title: string;
  readonly message: string;
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly deepLink?: string;
}

export interface NotificationRuleDef {
  readonly module: NotificationModule;
  readonly recipient: RecipientSpec;
  /** Derive the alert type, priority and rendered copy from the event payload. */
  readonly build: (payload: Record<string, unknown>) => RenderedNotification;
}

/** Best-effort string read from an untyped event payload. */
const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const uuid = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export const NOTIFICATION_RULES: Readonly<Record<string, NotificationRuleDef>> = {
  'purchase-order.created': {
    module: NotificationModule.PURCHASE_ORDER,
    recipient: { kind: 'roles', roles: [RoleName.OWNER, RoleName.PURCHASE_MANAGER] },
    build: (p) => ({
      alertType: AlertType.PURCHASE_ORDER_CREATED,
      priority: NotificationPriority.NORMAL,
      title: `Purchase order ${str(p.poNumber, 'created')}`,
      message: `PO ${str(p.poNumber)} for ${str(p.supplierName, 'a supplier')} was created.`,
      referenceType: 'purchase_order',
      referenceId: uuid(p.purchaseOrderId),
    }),
  },
  'goods-receipt.created': {
    module: NotificationModule.GOODS_RECEIPT,
    recipient: {
      kind: 'roles',
      roles: [RoleName.OWNER, RoleName.ADMIN, RoleName.INVENTORY_MANAGER, RoleName.PURCHASE_MANAGER],
    },
    build: (p) => {
      const poRef = str(p.poNumber) ? ` for ${str(p.poNumber)}` : '';
      const grId = uuid(p.goodsReceiptId);
      return {
        alertType: AlertType.GOODS_RECEIPT_CREATED,
        priority: NotificationPriority.NORMAL,
        title: 'Goods Received',
        message: `${str(p.grNumber)} has been posted${poRef}`,
        referenceType: 'goods_receipt',
        referenceId: grId,
        deepLink: grId ? `/goods-receipts/${grId}` : undefined,
      };
    },
  },
  'stock.fell-below-minimum': {
    module: NotificationModule.INVENTORY,
    recipient: { kind: 'roles', roles: [RoleName.OWNER, RoleName.INVENTORY_MANAGER] },
    build: (p) => {
      const critical = p.critical === true;
      return {
        alertType: critical ? AlertType.CRITICAL_STOCK : AlertType.LOW_STOCK,
        priority: critical ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
        title: critical ? 'Critical stock' : 'Low stock',
        message: `${str(p.productName, 'A product')} is at ${str(p.currentStock, '0')} — at or below its minimum.`,
        referenceType: 'product',
        referenceId: uuid(p.productId),
      };
    },
  },
  'quotation.received': {
    module: NotificationModule.RFQ,
    recipient: { kind: 'roles', roles: [RoleName.OWNER, RoleName.PURCHASE_MANAGER] },
    build: (p) => ({
      alertType: AlertType.RFQ_RESPONSE_RECEIVED,
      priority: NotificationPriority.NORMAL,
      title: `Quote ${str(p.quoteNumber, 'received')}`,
      message: `${str(p.supplierName, 'A supplier')} submitted quote ${str(p.quoteNumber)}${
        str(p.rfqNumber) ? ` for RFQ ${str(p.rfqNumber)}` : ''
      }.`,
      referenceType: 'rfq',
      referenceId: uuid(p.rfqId),
    }),
  },
  'approval.requested': {
    module: NotificationModule.APPROVAL,
    recipient: { kind: 'payloadUser', field: 'assignedToUserId' },
    build: (p) => ({
      alertType: AlertType.PURCHASE_ORDER_CREATED,
      priority: NotificationPriority.HIGH,
      title: `Approval needed: ${str(p.approvalType, 'request')}`,
      message: `${str(p.documentNumber, 'A document')} awaits your approval.`,
      referenceType: 'approval',
      referenceId: uuid(p.approvalId),
    }),
  },
  'approval.approved': {
    module: NotificationModule.APPROVAL,
    recipient: { kind: 'payloadUser', field: 'requestedByUserId' },
    build: (p) => ({
      alertType: AlertType.PURCHASE_ORDER_APPROVED,
      priority: NotificationPriority.NORMAL,
      title: `Approved: ${str(p.approvalType, 'request')}`,
      message: `${str(p.documentNumber, 'Your request')} was approved.`,
      referenceType: 'approval',
      referenceId: uuid(p.approvalId),
    }),
  },
  'approval.rejected': {
    module: NotificationModule.APPROVAL,
    recipient: { kind: 'payloadUser', field: 'requestedByUserId' },
    build: (p) => ({
      alertType: AlertType.PURCHASE_ORDER_REJECTED,
      priority: NotificationPriority.HIGH,
      title: `Rejected: ${str(p.approvalType, 'request')}`,
      message: `${str(p.documentNumber, 'Your request')} was rejected${
        str(p.rejectionReason) ? `: ${str(p.rejectionReason)}` : ''
      }.`,
      referenceType: 'approval',
      referenceId: uuid(p.approvalId),
    }),
  },
  'inventory-lot.expiring': {
    module: NotificationModule.INVENTORY,
    recipient: { kind: 'roles', roles: [RoleName.OWNER, RoleName.INVENTORY_MANAGER] },
    build: (p) => ({
      alertType: AlertType.STOCK_EXPIRING,
      priority: NotificationPriority.NORMAL,
      title: 'Lot expiring',
      message: `Lot ${str(p.lotNumber)} of ${str(p.productName, 'a product')} expires in ${str(
        p.daysLeft,
        'a few',
      )} day(s).`,
      referenceType: 'inventory_lot',
      referenceId: uuid(p.lotId),
    }),
  },
  'inventory-lot.expiring-critical': {
    module: NotificationModule.INVENTORY,
    recipient: { kind: 'roles', roles: [RoleName.OWNER, RoleName.INVENTORY_MANAGER] },
    build: (p) => ({
      alertType: AlertType.STOCK_EXPIRING,
      priority: NotificationPriority.HIGH,
      title: 'Lot expiring tomorrow',
      message: `Lot ${str(p.lotNumber)} of ${str(p.productName, 'a product')} expires within 1 day.`,
      referenceType: 'inventory_lot',
      referenceId: uuid(p.lotId),
    }),
  },
  'inventory-lot.expired': {
    module: NotificationModule.INVENTORY,
    recipient: { kind: 'roles', roles: [RoleName.OWNER, RoleName.INVENTORY_MANAGER] },
    build: (p) => ({
      alertType: AlertType.STOCK_EXPIRED,
      priority: NotificationPriority.HIGH,
      title: 'Lot expired',
      message: 'An inventory lot has expired and was auto-blocked.',
      referenceType: 'inventory_lot',
      referenceId: uuid(p.lotId),
    }),
  },
};

export const isNotifiableEvent = (eventType: string): boolean =>
  Object.prototype.hasOwnProperty.call(NOTIFICATION_RULES, eventType);
