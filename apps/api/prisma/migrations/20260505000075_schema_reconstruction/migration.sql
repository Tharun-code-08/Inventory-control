-- Schema Reconstruction: Apply only missing tables from production database
-- This captures tables that were created outside the migration system
-- Generated from staging database schema dump

-- ========== TYPES/ENUMS (Safe: no duplicates) ==========

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentTaskStatus') THEN
    CREATE TYPE public."AgentTaskStatus" AS ENUM (
        'DRAFT',
        'WAITING_APPROVAL',
        'RUNNING',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentTaskStepStatus') THEN
    CREATE TYPE public."AgentTaskStepStatus" AS ENUM (
        'PENDING',
        'RUNNING',
        'COMPLETED',
        'FAILED',
        'SKIPPED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiModelRole') THEN
    CREATE TYPE public."AiModelRole" AS ENUM (
        'INTENT',
        'REASONING',
        'ESCALATION'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertType') THEN
    CREATE TYPE public."AlertType" AS ENUM (
        'LOW_STOCK',
        'STOCK_EXPIRING',
        'STOCK_EXPIRED',
        'CONTRACT_EXPIRY',
        'RFQ_DEADLINE',
        'PO_OVERDUE',
        'GOODS_RECEIPT_CREATED',
        'GOODS_RECEIPT_APPROVED',
        'GOODS_RECEIPT_REJECTED',
        'PURCHASE_ORDER_CREATED',
        'PURCHASE_ORDER_APPROVED',
        'PURCHASE_ORDER_REJECTED',
        'RFQ_CREATED',
        'RFQ_RESPONSE_RECEIVED',
        'RFQ_APPROVED',
        'RFQ_REJECTED',
        'SALES_QUOTATION_CREATED',
        'SALES_QUOTATION_APPROVED',
        'SALES_QUOTATION_REJECTED',
        'WAREHOUSE_TRANSFER_COMPLETED',
        'CRITICAL_STOCK',
        'NEGATIVE_STOCK_PREVENTION',
        'INVENTORY_ADJUSTMENT_COMPLETED',
        'WAREHOUSE_CAPACITY_ALERT',
        'NEW_DEVICE_LOGIN',
        'PASSWORD_CHANGED',
        'SESSION_REVOKED',
        'BIOMETRIC_LOGIN_ENABLED',
        'LOGIN_ATTEMPT_LOCKOUT',
        'SYSTEM_MAINTENANCE',
        'VERSION_UPDATE',
        'COMPANY_ANNOUNCEMENT',
        'FEATURE_RELEASE'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApprovalStatus') THEN
    CREATE TYPE public."ApprovalStatus" AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApprovalType') THEN
    CREATE TYPE public."ApprovalType" AS ENUM (
        'GOODS_RECEIPT',
        'PURCHASE_ORDER',
        'RFQ',
        'SALES_QUOTATION',
        'WAREHOUSE_TRANSFER',
        'INVENTORY_ADJUSTMENT'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    CREATE TYPE public."AuditAction" AS ENUM (
        'CREATE',
        'UPDATE',
        'DELETE',
        'POST',
        'EXPORT',
        'EMAIL',
        'DASHBOARD_EXIT',
        'ATTENTION_ITEM_RESOLVED',
        'STOCK_ADJUSTMENT',
        'APPROVE',
        'APPROVE_PO',
        'BULK_UPDATE',
        'CANCEL_PO',
        'CONFIRM_PO',
        'CREATE_GR',
        'CREATE_ISSUE',
        'CREATE_PO',
        'CREATE_PRODUCT',
        'CREATE_USER',
        'DASHBOARD_ACTION_TAKEN',
        'DASHBOARD_CARD_CLICKED',
        'DELETE_DATA',
        'DELETE_PRODUCT',
        'DELETE_USER',
        'ESCALATE',
        'EXPORT_AUDIT',
        'EXPORT_REPORT',
        'LOGIN',
        'LOGIN_FAILED',
        'LOGOUT',
        'MFA_DISABLED',
        'MFA_ENABLED',
        'PASSWORD_CHANGED',
        'RECEIVE_GOODS',
        'REJECT',
        'REJECT_PO',
        'REVOKE_SESSION',
        'TRANSFER_STOCK',
        'UPDATE_GR',
        'UPDATE_PO',
        'UPDATE_PRODUCT',
        'UPDATE_ROLE',
        'UPDATE_USER',
        'VIEW_DASHBOARD',
        'LINK_TOKEN_GENERATED',
        'LINK_TOKEN_USED',
        'DEVICE_LINKED',
        'DEVICE_REVOKED',
        'DEVICE_REJECTED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditSeverity') THEN
    CREATE TYPE public."AuditSeverity" AS ENUM (
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthChallengePurpose') THEN
    CREATE TYPE public."AuthChallengePurpose" AS ENUM (
        'SIGNUP_MFA_ENROLL',
        'LOGIN_MFA_VERIFY'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BackupJobStatus') THEN
    CREATE TYPE public."BackupJobStatus" AS ENUM (
        'PENDING',
        'RUNNING',
        'COMPLETED',
        'FAILED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BackupProvider') THEN
    CREATE TYPE public."BackupProvider" AS ENUM (
        'MANUAL',
        'GOOGLE_DRIVE',
        'EMAIL'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BarcodeType') THEN
    CREATE TYPE public."BarcodeType" AS ENUM (
        'EAN13',
        'UPC_A',
        'CODE128',
        'CODE39',
        'QR',
        'INTERNAL'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingCycle') THEN
    CREATE TYPE public."BillingCycle" AS ENUM (
        'MONTHLY',
        'YEARLY'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BrandingMode') THEN
    CREATE TYPE public."BrandingMode" AS ENUM (
        'LIVE',
        'SNAPSHOT'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChannelAccountStatus') THEN
    CREATE TYPE public."ChannelAccountStatus" AS ENUM (
        'ACTIVE',
        'DISABLED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChannelLinkStatus') THEN
    CREATE TYPE public."ChannelLinkStatus" AS ENUM (
        'PENDING',
        'ACTIVE',
        'REVOKED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatChannel') THEN
    CREATE TYPE public."ChatChannel" AS ENUM (
        'WHATSAPP'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatMessageStatus') THEN
    CREATE TYPE public."ChatMessageStatus" AS ENUM (
        'RECEIVED',
        'QUEUED',
        'SENT',
        'DELIVERED',
        'READ',
        'FAILED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationStatus') THEN
    CREATE TYPE public."ConversationStatus" AS ENUM (
        'ACTIVE',
        'AWAITING_CONFIRMATION',
        'AWAITING_APPROVAL',
        'HANDOFF',
        'CLOSED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CostingMethod') THEN
    CREATE TYPE public."CostingMethod" AS ENUM (
        'AVERAGE',
        'FIFO'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreditNoteStatus') THEN
    CREATE TYPE public."CreditNoteStatus" AS ENUM (
        'DRAFT',
        'ISSUED',
        'APPLIED',
        'VOID'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryChannel') THEN
    CREATE TYPE public."DeliveryChannel" AS ENUM (
        'IN_APP',
        'WHATSAPP',
        'EMAIL'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryState') THEN
    CREATE TYPE public."DeliveryState" AS ENUM (
        'CREATED',
        'QUEUED',
        'DISPATCHING',
        'SENT',
        'DELIVERED',
        'READ',
        'ACKNOWLEDGED',
        'FAILED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DevicePlatform') THEN
    CREATE TYPE public."DevicePlatform" AS ENUM (
        'ANDROID',
        'IOS',
        'WEB'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentEmailStatus') THEN
    CREATE TYPE public."DocumentEmailStatus" AS ENUM (
        'PENDING_PDF',
        'PENDING_SEND',
        'SENT',
        'DELIVERED',
        'FAILED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentEmailTrigger') THEN
    CREATE TYPE public."DocumentEmailTrigger" AS ENUM (
        'AUTO',
        'MANUAL',
        'RESEND'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentSeriesRestart') THEN
    CREATE TYPE public."DocumentSeriesRestart" AS ENUM (
        'NONE',
        'MONTHLY',
        'YEARLY'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
    CREATE TYPE public."DocumentStatus" AS ENUM (
        'DRAFT',
        'POSTED',
        'DISPATCHED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailSenderStatus') THEN
    CREATE TYPE public."EmailSenderStatus" AS ENUM (
        'PENDING',
        'VERIFIED',
        'FAILED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailSenderType') THEN
    CREATE TYPE public."EmailSenderType" AS ENUM (
        'CUSTOM_DOMAIN',
        'PUBLIC_DOMAIN'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventClassification') THEN
    CREATE TYPE public."EventClassification" AS ENUM (
        'AUTHENTICATION',
        'SECURITY',
        'FINANCIAL',
        'COMPLIANCE',
        'OPERATIONAL',
        'SYSTEM',
        'AI',
        'MARKETING'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EwayBillStatus') THEN
    CREATE TYPE public."EwayBillStatus" AS ENUM (
        'DRAFT',
        'GENERATED',
        'CANCELLED',
        'EXPIRED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EwayDocumentType') THEN
    CREATE TYPE public."EwayDocumentType" AS ENUM (
        'TAX_INVOICE',
        'BILL_OF_SUPPLY',
        'DELIVERY_CHALLAN',
        'CREDIT_NOTE',
        'BILL_OF_ENTRY',
        'OTHERS'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EwaySubType') THEN
    CREATE TYPE public."EwaySubType" AS ENUM (
        'SUPPLY',
        'EXPORT',
        'IMPORT',
        'JOB_WORK',
        'SKD_CKD',
        'RECIPIENT_NOT_KNOWN',
        'LINE_SALES',
        'SALES_RETURN',
        'EXHIBITION',
        'OTHERS'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EwaySupplyType') THEN
    CREATE TYPE public."EwaySupplyType" AS ENUM (
        'OUTWARD',
        'INWARD'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EwayTransactionType') THEN
    CREATE TYPE public."EwayTransactionType" AS ENUM (
        'REGULAR',
        'BILL_TO_SHIP_TO',
        'BILL_FROM_DISPATCH_FROM',
        'COMBINATION'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EwayTransportMode') THEN
    CREATE TYPE public."EwayTransportMode" AS ENUM (
        'ROAD',
        'RAIL',
        'AIR',
        'SHIP'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EwayVehicleType') THEN
    CREATE TYPE public."EwayVehicleType" AS ENUM (
        'REGULAR',
        'ODC'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExpiryTracking') THEN
    CREATE TYPE public."ExpiryTracking" AS ENUM (
        'NONE',
        'OPTIONAL',
        'MANDATORY'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FulfillmentStatus') THEN
    CREATE TYPE public."FulfillmentStatus" AS ENUM (
        'NONE',
        'PARTIAL',
        'FULL'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GstSupplyType') THEN
    CREATE TYPE public."GstSupplyType" AS ENUM (
        'INTRA_STATE',
        'INTER_STATE'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryLotStatus') THEN
    CREATE TYPE public."InventoryLotStatus" AS ENUM (
        'ACTIVE',
        'BLOCKED',
        'CONSUMED',
        'SCRAPPED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
    CREATE TYPE public."InvoiceStatus" AS ENUM (
        'DRAFT',
        'ISSUED',
        'PARTIALLY_PAID',
        'PAID',
        'VOID'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InwardShift') THEN
    CREATE TYPE public."InwardShift" AS ENUM (
        'DAY_SHIFT',
        'NIGHT_SHIFT'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LifecycleCampaignStatus') THEN
    CREATE TYPE public."LifecycleCampaignStatus" AS ENUM (
        'SCHEDULED',
        'SENT',
        'SKIPPED',
        'FAILED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LifecycleStage') THEN
    CREATE TYPE public."LifecycleStage" AS ENUM (
        'NEW',
        'ACTIVE',
        'ENGAGED',
        'AT_RISK',
        'RENEWAL_DUE',
        'EXPIRED',
        'TRIAL',
        'TRIAL_EXPIRED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LifecycleStatus') THEN
    CREATE TYPE public."LifecycleStatus" AS ENUM (
        'ACTIVE',
        'INACTIVE',
        'OBSOLETE',
        'REPLACED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LinkTokenStatus') THEN
    CREATE TYPE public."LinkTokenStatus" AS ENUM (
        'ACTIVE',
        'USED',
        'EXPIRED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaAssetType') THEN
    CREATE TYPE public."MediaAssetType" AS ENUM (
        'LOGO',
        'STAMP',
        'SIGNATURE',
        'LETTERHEAD',
        'WATERMARK'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageDirection') THEN
    CREATE TYPE public."MessageDirection" AS ENUM (
        'IN',
        'OUT'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MfaMethod') THEN
    CREATE TYPE public."MfaMethod" AS ENUM (
        'TOTP'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationModule') THEN
    CREATE TYPE public."NotificationModule" AS ENUM (
        'GOODS_RECEIPT',
        'PURCHASE_ORDER',
        'RFQ',
        'SALES_QUOTATION',
        'WAREHOUSE_TRANSFER',
        'INVENTORY',
        'SECURITY',
        'SYSTEM',
        'APPROVAL'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationPriority') THEN
    CREATE TYPE public."NotificationPriority" AS ENUM (
        'CRITICAL',
        'HIGH',
        'NORMAL',
        'LOW'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationStatus') THEN
    CREATE TYPE public."NotificationStatus" AS ENUM (
        'UNREAD',
        'READ',
        'DELETED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OutboxStatus') THEN
    CREATE TYPE public."OutboxStatus" AS ENUM (
        'CREATED',
        'VALIDATED',
        'PENDING',
        'PUBLISHED',
        'ACKNOWLEDGED',
        'FAILED',
        'DEAD',
        'REPLAYED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PasswordResetMethod') THEN
    CREATE TYPE public."PasswordResetMethod" AS ENUM (
        'OTP',
        'MAGIC_LINK'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformNotificationCategory') THEN
    CREATE TYPE public."PlatformNotificationCategory" AS ENUM (
        'REVENUE',
        'HEALTH',
        'SYSTEM'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformNotificationSeverity') THEN
    CREATE TYPE public."PlatformNotificationSeverity" AS ENUM (
        'CRITICAL',
        'HIGH',
        'WARNING',
        'INFO'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PurchaseOrderStatus') THEN
    CREATE TYPE public."PurchaseOrderStatus" AS ENUM (
        'DRAFT',
        'CONFIRMED',
        'CANCELLED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReceiptSource') THEN
    CREATE TYPE public."ReceiptSource" AS ENUM (
        'PURCHASE_ORDER',
        'OUTSIDE'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReceiptType') THEN
    CREATE TYPE public."ReceiptType" AS ENUM (
        'FULL',
        'PARTIAL'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RestoreJobStatus') THEN
    CREATE TYPE public."RestoreJobStatus" AS ENUM (
        'PENDING',
        'DRY_RUN_COMPLETED',
        'RUNNING',
        'COMPLETED',
        'FAILED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RestoreMode') THEN
    CREATE TYPE public."RestoreMode" AS ENUM (
        'TENANT_REPLACE',
        'FULL_DB'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReturnStatus') THEN
    CREATE TYPE public."ReturnStatus" AS ENUM (
        'DRAFT',
        'POSTED',
        'CANCELLED',
        'SUBMITTED',
        'ACKNOWLEDGED',
        'DONE'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleName') THEN
    CREATE TYPE public."RoleName" AS ENUM (
        'ADMIN',
        'SHOP_USER',
        'INVENTORY_MANAGER',
        'OWNER',
        'WAREHOUSE_STAFF',
        'VIEWER',
        'VENDOR',
        'PURCHASE_MANAGER',
        'SALES',
        'EMPLOYEE'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SalesOrderStatus') THEN
    CREATE TYPE public."SalesOrderStatus" AS ENUM (
        'DRAFT',
        'CONFIRMED',
        'FULFILLED',
        'CLOSED',
        'CANCELLED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SalesQuotationStatus') THEN
    CREATE TYPE public."SalesQuotationStatus" AS ENUM (
        'DRAFT',
        'SENT',
        'ACCEPTED',
        'USER_REQUESTED',
        'CANCELLED',
        'CONVERTED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScanAction') THEN
    CREATE TYPE public."ScanAction" AS ENUM (
        'LOOKUP',
        'GOODS_RECEIPT',
        'GOODS_ISSUE',
        'STOCK_COUNT',
        'SALES_ORDER',
        'PURCHASE_ORDER',
        'STOCK_TRANSFER'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScanResult') THEN
    CREATE TYPE public."ScanResult" AS ENUM (
        'FOUND',
        'NOT_FOUND',
        'INVALID'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScanSource') THEN
    CREATE TYPE public."ScanSource" AS ENUM (
        'WEB',
        'MOBILE',
        'USB_SCANNER',
        'CAMERA',
        'API'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockCountStatus') THEN
    CREATE TYPE public."StockCountStatus" AS ENUM (
        'OPEN',
        'REVIEW',
        'APPROVED',
        'CANCELLED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockTransferCreatedVia') THEN
    CREATE TYPE public."StockTransferCreatedVia" AS ENUM (
        'MANUAL',
        'DRAG_DROP',
        'BULK',
        'API'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPlan') THEN
    CREATE TYPE public."SubscriptionPlan" AS ENUM (
        'TRIAL',
        'PRO',
        'PLUS'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE public."SubscriptionStatus" AS ENUM (
        'ACTIVE',
        'EXPIRED',
        'CANCELLED',
        'SUSPENDED'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupplierBillStatus') THEN
    CREATE TYPE public."SupplierBillStatus" AS ENUM (
        'DRAFT',
        'ISSUED',
        'PARTIALLY_PAID',
        'PAID',
        'VOID'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupplierReturnReasonCode') THEN
    CREATE TYPE public."SupplierReturnReasonCode" AS ENUM (
        'DAMAGED',
        'WRONG_ITEM',
        'EXPIRED',
        'EXCESS'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxPreference') THEN
    CREATE TYPE public."TaxPreference" AS ENUM (
        'TAXABLE',
        'NON_TAXABLE'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
    CREATE TYPE public."TransactionType" AS ENUM (
        'OPENING',
        'GOODS_RECEIPT',
        'GOODS_ISSUE',
        'DAMAGE',
        'ADJUSTMENT',
        'STOCK_TRANSFER_OUT',
        'STOCK_TRANSFER_IN'
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsAppDeviceStatus') THEN
    CREATE TYPE public."WhatsAppDeviceStatus" AS ENUM (
        'ACTIVE',
        'REVOKED',
        'ARCHIVED'
    );
  END IF;
END $$;



-- ========== NEW TABLES (Not in earlier migrations) ==========

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_task_steps') THEN
    CREATE TABLE public.agent_task_steps (
        id uuid NOT NULL,
        task_id uuid NOT NULL,
        "order" integer NOT NULL,
        name text NOT NULL,
        status public."AgentTaskStepStatus" DEFAULT 'PENDING'::public."AgentTaskStepStatus" NOT NULL,
        attempts integer DEFAULT 0 NOT NULL,
        result jsonb,
        error text,
        started_at timestamp(6) with time zone,
        completed_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;


CREATE TABLE public.agent_tasks (
    id uuid NOT NULL,
    task_number integer NOT NULL,
    company_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    type text NOT NULL,
    status public."AgentTaskStatus" DEFAULT 'DRAFT'::public."AgentTaskStatus" NOT NULL,
    payload jsonb NOT NULL,
    summary text NOT NULL,
    result jsonb,
    approved_by uuid,
    approved_at timestamp(6) with time zone,
    completed_at timestamp(6) with time zone,
    failure_reason text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.ai_prompt_history (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    version integer NOT NULL,
    body text NOT NULL,
    created_by uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.ai_settings (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    provider text DEFAULT 'deepseek'::text NOT NULL,
    intent_model text,
    reasoning_model text,
    escalation_model text,
    feature_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
    daily_request_limit integer,
    monthly_token_limit integer,
    monthly_cost_cents_limit integer,
    approval_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
    prompt_version integer DEFAULT 0 NOT NULL,
    system_prompt text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.ai_usage_logs (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    conversation_id uuid,
    model text NOT NULL,
    role public."AiModelRole" NOT NULL,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    cost_cents integer DEFAULT 0 NOT NULL,
    tool_duration_ms integer,
    tool_errors integer DEFAULT 0 NOT NULL,
    escalated boolean DEFAULT false NOT NULL,
    human_handoff boolean DEFAULT false NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tool_call_count integer DEFAULT 0 NOT NULL,
    tool_rounds integer DEFAULT 0 NOT NULL,
    duration_ms integer,
    timed_out boolean DEFAULT false NOT NULL
);

CREATE TABLE public.alert_events (
    id uuid NOT NULL,
    alert_type public."AlertType" NOT NULL,
    severity text DEFAULT 'MEDIUM'::text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    shop_id uuid,
    reference_type text,
    reference_id text,
    is_read boolean DEFAULT false NOT NULL,
    triggered_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at timestamp(6) with time zone
);

CREATE TABLE public.approval_comments (
    id uuid NOT NULL,
    approval_id uuid NOT NULL,
    user_id uuid NOT NULL,
    comment text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.approval_escalations (
    id uuid NOT NULL,
    approval_id uuid NOT NULL,
    escalated_to uuid NOT NULL,
    escalated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    reason text,
    resolved_at timestamp(6) with time zone
);

CREATE TABLE public.approval_requests (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    assigned_to uuid NOT NULL,
    approval_type public."ApprovalType" NOT NULL,
    reference_id text NOT NULL,
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    document_number text,
    amount numeric(14,2),
    description text,
    rejection_reason text,
    approved_at timestamp(6) with time zone,
    rejected_at timestamp(6) with time zone,
    required_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    user_id uuid,
    action public."AuditAction" NOT NULL,
    entity_type text,
    entity_id text,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    company_id uuid,
    device_id text,
    metadata jsonb,
    reason text,
    severity public."AuditSeverity",
    request_id text
);

CREATE TABLE public.auth_challenges (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    purpose public."AuthChallengePurpose" NOT NULL,
    token_hash text NOT NULL,
    totp_secret_encrypted text,
    attempt_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    consumed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    requested_ip text,
    requested_user_agent text
);

CREATE TABLE public.backup_artifacts (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    backup_job_id uuid,
    file_name text NOT NULL,
    storage_path text NOT NULL,
    file_size bigint NOT NULL,
    sha256 text NOT NULL,
    provider public."BackupProvider" NOT NULL,
    drive_file_id text,
    schema_version integer DEFAULT 1 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.backup_jobs (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    status public."BackupJobStatus" DEFAULT 'PENDING'::public."BackupJobStatus" NOT NULL,
    provider public."BackupProvider" NOT NULL,
    error_message text,
    started_at timestamp(6) with time zone,
    completed_at timestamp(6) with time zone,
    created_by uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(6) with time zone,
    deleted_by uuid,
    lifecycle_status public."LifecycleStatus" DEFAULT 'ACTIVE'::public."LifecycleStatus" NOT NULL
);

CREATE TABLE public.backup_provider_credentials (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    provider public."BackupProvider" DEFAULT 'GOOGLE_DRIVE'::public."BackupProvider" NOT NULL,
    encrypted_tokens text NOT NULL,
    account_email text,
    drive_folder_id text,
    connected_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.barcode_audit_logs (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    barcode_id uuid,
    barcode text NOT NULL,
    product_id uuid,
    action text NOT NULL,
    detail jsonb,
    user_id uuid NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.barcode_history (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    barcode text NOT NULL,
    old_product_id uuid,
    new_product_id uuid,
    user_id uuid NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.barcode_print_jobs (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    template_id uuid NOT NULL,
    pdf_url text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    quantities jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    label_count integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.barcode_template_versions (
    id uuid NOT NULL,
    template_name text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    json_content jsonb NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid
);

CREATE TABLE public.branding_profiles (
    id uuid NOT NULL,
    branding_version integer DEFAULT 1 NOT NULL,
    logo_asset_id uuid,
    watermark_asset_id uuid,
    seal_asset_id uuid,
    signature_asset_id uuid,
    letterhead_asset_id uuid,
    footer_text text,
    email text,
    phone text,
    website text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    company_name text,
    gst_number text,
    address text,
    primary_color text,
    secondary_color text,
    accent_color text
);

CREATE TABLE public.channel_accounts (
    id uuid NOT NULL,
    company_id uuid,
    channel public."ChatChannel" DEFAULT 'WHATSAPP'::public."ChatChannel" NOT NULL,
    provider text DEFAULT 'meta'::text NOT NULL,
    business_account_id text,
    phone_number_id text NOT NULL,
    display_phone text,
    access_token text,
    webhook_secret text,
    status public."ChannelAccountStatus" DEFAULT 'ACTIVE'::public."ChannelAccountStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.companies (
    id uuid NOT NULL,
    company_code text NOT NULL,
    company_name text NOT NULL,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    subscription_plan public."SubscriptionPlan" DEFAULT 'TRIAL'::public."SubscriptionPlan" NOT NULL,
    billing_cycle public."BillingCycle",
    subscription_status public."SubscriptionStatus" DEFAULT 'ACTIVE'::public."SubscriptionStatus" NOT NULL,
    trial_starts_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    subscription_ends_at timestamp with time zone,
    platform_marketing_opt_out boolean DEFAULT false NOT NULL,
    razorpay_subscription_id text,
    paid_activated_at timestamp(6) with time zone,
    branding_profile_id uuid
);

CREATE TABLE public.company_engagement_snapshots (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    lifecycle_stage public."LifecycleStage" NOT NULL,
    last_login_at timestamp(6) with time zone,
    login_count_30d integer DEFAULT 0 NOT NULL,
    features_used jsonb DEFAULT '{}'::jsonb NOT NULL,
    products_count integer DEFAULT 0 NOT NULL,
    inventory_txn_count integer DEFAULT 0 NOT NULL,
    team_members_count integer DEFAULT 0 NOT NULL,
    reports_generated integer DEFAULT 0 NOT NULL,
    trial_progress_pct integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.company_health_score_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    config jsonb DEFAULT '{"weights": {}, "schemaVersion": 1}'::jsonb NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.company_settings (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.contract_header (
    id uuid NOT NULL,
    contract_number text NOT NULL,
    shop_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    rfq_id uuid,
    quotation_id uuid,
    title text NOT NULL,
    payment_terms text,
    start_date date NOT NULL,
    end_date date,
    notes text,
    status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
    posted_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.contract_items (
    id uuid NOT NULL,
    contract_id uuid NOT NULL,
    product_id uuid,
    description text,
    quantity numeric(12,3) NOT NULL,
    uom text NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    line_value numeric(14,2) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.conversations (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    user_channel_link_id uuid NOT NULL,
    status public."ConversationStatus" DEFAULT 'ACTIVE'::public."ConversationStatus" NOT NULL,
    summary text,
    last_message_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.customers (
    id uuid NOT NULL,
    customer_code text NOT NULL,
    customer_name text NOT NULL,
    email text,
    phone text,
    tax_id text,
    pan text,
    street text,
    city text,
    state text,
    postal_code text,
    country text,
    shop_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.data_retention_config (
    id uuid NOT NULL,
    entity text NOT NULL,
    retain_days integer NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.device_registrations (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    device_id text NOT NULL,
    device_name text,
    platform public."DevicePlatform" NOT NULL,
    push_token text,
    app_version text,
    os_version text,
    is_active boolean DEFAULT true NOT NULL,
    last_active_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.document_branding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    document_type text NOT NULL,
    settings jsonb NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.document_email_outbox (
    id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    document_number text NOT NULL,
    template_id text NOT NULL,
    company_id uuid NOT NULL,
    shop_id uuid,
    recipient text NOT NULL,
    attachment_filename text,
    status public."DocumentEmailStatus" DEFAULT 'PENDING_PDF'::public."DocumentEmailStatus" NOT NULL,
    trigger public."DocumentEmailTrigger" DEFAULT 'MANUAL'::public."DocumentEmailTrigger" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_retry_at timestamp(6) with time zone,
    payload_json jsonb NOT NULL,
    sent_at timestamp(6) with time zone,
    sent_by_id uuid,
    message_id text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.document_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    reference_id uuid,
    template_version character varying(20) DEFAULT '1.0'::character varying NOT NULL,
    storage_key character varying(500) NOT NULL,
    storage_provider character varying(50) DEFAULT 'local'::character varying NOT NULL,
    file_size_bytes bigint,
    checksum character varying(64),
    job_id character varying(100),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    generated_by uuid,
    generated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    download_count integer DEFAULT 0,
    last_downloaded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    mime_type character varying(100) DEFAULT 'application/pdf'::character varying NOT NULL,
    render_duration_ms integer,
    rendered_at timestamp with time zone,
    storage_latency_ms integer
);

CREATE TABLE public.document_series_config (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    shop_id uuid,
    doc_type text NOT NULL,
    module_label text NOT NULL,
    prefix text NOT NULL,
    starting_number integer DEFAULT 1 NOT NULL,
    pad_width integer DEFAULT 5 NOT NULL,
    restart_period public."DocumentSeriesRestart" DEFAULT 'NONE'::public."DocumentSeriesRestart" NOT NULL,
    shop_scoped boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    use_category_prefix boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.email_delivery_log (
    id uuid NOT NULL,
    template_id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    recipient text NOT NULL,
    sent_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    click_count integer DEFAULT 0 NOT NULL,
    open_count integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.email_sender_domains (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    domain text NOT NULL,
    dkim_selector text NOT NULL,
    dkim_host text NOT NULL,
    dkim_value text NOT NULL,
    status public."EmailSenderStatus" DEFAULT 'PENDING'::public."EmailSenderStatus" NOT NULL,
    verified_at timestamp(6) with time zone,
    last_checked_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.email_sender_identities (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    domain_id uuid,
    display_name text NOT NULL,
    email text NOT NULL,
    sender_type public."EmailSenderType" NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    status public."EmailSenderStatus" DEFAULT 'PENDING'::public."EmailSenderStatus" NOT NULL,
    verified_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    smtp_host text,
    smtp_port integer,
    smtp_secure boolean,
    smtp_user text,
    smtp_password_enc text,
    smtp_configured_at timestamp(6) with time zone,
    smtp_last_verified_at timestamp(6) with time zone
);

CREATE TABLE public.email_sender_verifications (
    id uuid NOT NULL,
    sender_id uuid NOT NULL,
    otp_hash text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    consumed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.eway_bill_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    eway_bill_id uuid NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    description text,
    hsn_code text NOT NULL,
    quantity numeric(14,3) NOT NULL,
    unit text DEFAULT 'PCS'::text NOT NULL,
    taxable_amount numeric(14,2) NOT NULL,
    gst_rate numeric(5,2) NOT NULL,
    cgst numeric(14,2) DEFAULT 0 NOT NULL,
    sgst numeric(14,2) DEFAULT 0 NOT NULL,
    igst numeric(14,2) DEFAULT 0 NOT NULL,
    cess numeric(14,2) DEFAULT 0 NOT NULL,
    total numeric(14,2) NOT NULL
);

CREATE TABLE public.eway_bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    eway_bill_number text NOT NULL,
    shop_id uuid NOT NULL,
    invoice_id uuid,
    sales_order_id uuid,
    customer_id uuid,
    status public."EwayBillStatus" DEFAULT 'DRAFT'::public."EwayBillStatus" NOT NULL,
    supply_type public."EwaySupplyType" DEFAULT 'OUTWARD'::public."EwaySupplyType" NOT NULL,
    sub_type public."EwaySubType" DEFAULT 'SUPPLY'::public."EwaySubType" NOT NULL,
    transaction_type public."EwayTransactionType" DEFAULT 'REGULAR'::public."EwayTransactionType" NOT NULL,
    document_type public."EwayDocumentType" DEFAULT 'TAX_INVOICE'::public."EwayDocumentType" NOT NULL,
    document_number text NOT NULL,
    document_date date NOT NULL,
    from_gstin text,
    from_name text NOT NULL,
    from_address1 text,
    from_address2 text,
    from_place text,
    from_pincode text,
    from_state_code text,
    to_gstin text,
    to_name text NOT NULL,
    to_address1 text,
    to_address2 text,
    to_place text,
    to_pincode text,
    to_state_code text,
    transporter_gstin text,
    transporter_name text,
    transporter_id text,
    transport_mode public."EwayTransportMode" DEFAULT 'ROAD'::public."EwayTransportMode" NOT NULL,
    trans_doc_number text,
    trans_doc_date date,
    vehicle_number text,
    vehicle_type public."EwayVehicleType" DEFAULT 'REGULAR'::public."EwayVehicleType" NOT NULL,
    distance_km integer,
    taxable_value numeric(14,2) DEFAULT 0 NOT NULL,
    cgst_value numeric(14,2) DEFAULT 0 NOT NULL,
    sgst_value numeric(14,2) DEFAULT 0 NOT NULL,
    igst_value numeric(14,2) DEFAULT 0 NOT NULL,
    cess_value numeric(14,2) DEFAULT 0 NOT NULL,
    total_value numeric(14,2) DEFAULT 0 NOT NULL,
    valid_upto timestamp(6) without time zone,
    generated_at timestamp(6) without time zone,
    cancelled_at timestamp(6) without time zone,
    cancel_reason text,
    remarks text,
    created_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.goods_issue_item_lots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gi_item_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    quantity numeric(12,3) NOT NULL
);

CREATE TABLE public.inventory_exceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    type text NOT NULL,
    severity text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'OPEN'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    first_detected_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_detected_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    acknowledged_at timestamp(6) with time zone,
    acknowledged_by uuid,
    resolved_at timestamp(6) with time zone,
    resolved_by uuid,
    resolution_type text,
    resolution_notes text
);

CREATE TABLE public.inventory_lot_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lot_id uuid NOT NULL,
    threshold integer NOT NULL,
    event_id uuid NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.inventory_lots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    lot_number text NOT NULL,
    expiry_date date,
    qty_received numeric(12,3) DEFAULT 0 NOT NULL,
    qty_on_hand numeric(12,3) DEFAULT 0 NOT NULL,
    unit_cost numeric(14,4),
    status public."InventoryLotStatus" DEFAULT 'ACTIVE'::public."InventoryLotStatus" NOT NULL,
    storage_location_id uuid,
    gr_item_id uuid,
    blocked_at timestamp(6) with time zone,
    blocked_reason text,
    scrapped_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid,
    updated_by uuid,
    tenant_id uuid NOT NULL,
    CONSTRAINT chk_lot_qty_on_hand_non_negative CHECK ((qty_on_hand >= (0)::numeric))
);

CREATE TABLE public.invoice_header (
    id uuid NOT NULL,
    invoice_number text NOT NULL,
    invoice_date date NOT NULL,
    sales_order_id uuid,
    customer_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    status public."InvoiceStatus" DEFAULT 'DRAFT'::public."InvoiceStatus" NOT NULL,
    branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
    branding_snapshot jsonb,
    branding_version integer,
    template_version integer DEFAULT 1 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    fx_rate_used numeric(18,8),
    discount_amount numeric(14,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
    total_value numeric(14,2) NOT NULL,
    paid_value numeric(14,2) DEFAULT 0 NOT NULL,
    due_date date,
    remarks text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.lifecycle_campaign_enrollments (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    campaign_key text NOT NULL,
    scheduled_for timestamp(6) with time zone,
    sent_at timestamp(6) with time zone,
    status public."LifecycleCampaignStatus" DEFAULT 'SCHEDULED'::public."LifecycleCampaignStatus" NOT NULL,
    email_delivery_log_id uuid,
    metadata jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.media_assets (
    id uuid NOT NULL,
    company_id uuid,
    shop_id uuid,
    branding_profile_id uuid,
    type public."MediaAssetType" NOT NULL,
    asset_key text NOT NULL,
    file_name text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    metadata jsonb,
    uploaded_by uuid,
    uploaded_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    active boolean DEFAULT true NOT NULL
);

CREATE TABLE public.messages (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    direction public."MessageDirection" NOT NULL,
    wa_message_id text,
    type text DEFAULT 'text'::text NOT NULL,
    body text,
    payload jsonb,
    status public."ChatMessageStatus" DEFAULT 'RECEIVED'::public."ChatMessageStatus" NOT NULL,
    error text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.notification_audit_logs (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    notification_id uuid,
    approval_id uuid,
    details jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.notification_deliveries (
    id uuid NOT NULL,
    event_id uuid NOT NULL,
    notification_id uuid,
    company_id uuid NOT NULL,
    recipient_user_id uuid NOT NULL,
    channel public."DeliveryChannel" NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    state public."DeliveryState" DEFAULT 'CREATED'::public."DeliveryState" NOT NULL,
    classification public."EventClassification" NOT NULL,
    provider_message_id text,
    latency_ms integer,
    sla_seconds integer,
    correlation_id uuid NOT NULL,
    error text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.notification_preferences (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    gr_created boolean DEFAULT true NOT NULL,
    gr_approved boolean DEFAULT true NOT NULL,
    gr_rejected boolean DEFAULT true NOT NULL,
    po_approval_required boolean DEFAULT true NOT NULL,
    po_approved boolean DEFAULT true NOT NULL,
    po_rejected boolean DEFAULT true NOT NULL,
    low_stock_alert boolean DEFAULT true NOT NULL,
    transfer_completed boolean DEFAULT true NOT NULL,
    inventory_adjustment boolean DEFAULT true NOT NULL,
    login_alert boolean DEFAULT true NOT NULL,
    device_alert boolean DEFAULT true NOT NULL,
    push_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    whatsapp_enabled boolean DEFAULT false NOT NULL
);

CREATE TABLE public.notification_rules (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    event_type text NOT NULL,
    recipient_roles text[],
    channels public."DeliveryChannel"[],
    priority public."NotificationPriority" DEFAULT 'NORMAL'::public."NotificationPriority" NOT NULL,
    sla_seconds integer NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.notification_templates (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    event_type text NOT NULL,
    channel public."DeliveryChannel" NOT NULL,
    title text,
    body text,
    email_subject text,
    email_body text,
    wa_template_name text,
    wa_language text,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type public."AlertType" NOT NULL,
    priority public."NotificationPriority" DEFAULT 'NORMAL'::public."NotificationPriority" NOT NULL,
    module public."NotificationModule" NOT NULL,
    status public."NotificationStatus" DEFAULT 'UNREAD'::public."NotificationStatus" NOT NULL,
    reference_type text,
    reference_id text,
    deep_link text,
    action_url text,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(6) with time zone,
    created_by uuid
);

CREATE TABLE public.outbox_events (
    id uuid NOT NULL,
    event_id uuid NOT NULL,
    event_type text NOT NULL,
    event_version integer NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    company_id uuid NOT NULL,
    classification public."EventClassification" NOT NULL,
    payload jsonb NOT NULL,
    correlation_id uuid NOT NULL,
    causation_id uuid,
    trace_id text,
    span_id text,
    actor_id uuid,
    status public."OutboxStatus" DEFAULT 'PENDING'::public."OutboxStatus" NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_attempt_at timestamp(6) with time zone,
    published_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.password_reset_requests (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    method public."PasswordResetMethod" NOT NULL,
    otp_hash text,
    link_token_hash text,
    attempt_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    consumed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_sent_at timestamp(6) with time zone,
    requested_ip text,
    requested_user_agent text
);

CREATE TABLE public.payment_receipts (
    id uuid NOT NULL,
    receipt_number text NOT NULL,
    receipt_date date NOT NULL,
    invoice_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    fx_rate_used numeric(18,8),
    method text,
    reference text,
    remarks text,
    branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
    branding_snapshot jsonb,
    branding_version integer,
    template_version integer DEFAULT 1 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.pdf_jobs (
    id character varying(100) NOT NULL,
    tenant_id uuid NOT NULL,
    document_id uuid,
    job_type character varying(50),
    status character varying(50),
    progress integer DEFAULT 0,
    result jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);

CREATE TABLE public.platform_audit_log (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    action public."AuditAction" NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.platform_notification_reads (
    id uuid NOT NULL,
    notification_id uuid NOT NULL,
    admin_email text NOT NULL,
    read_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.platform_notifications (
    id uuid NOT NULL,
    category public."PlatformNotificationCategory" NOT NULL,
    severity public."PlatformNotificationSeverity" DEFAULT 'INFO'::public."PlatformNotificationSeverity" NOT NULL,
    notification_key text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_url text,
    reference_type text,
    reference_id uuid,
    company_id uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(6) with time zone
);

CREATE TABLE public.po_cancel_verifications (
    id uuid NOT NULL,
    po_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reason text NOT NULL,
    otp_hash text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    consumed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.product_barcodes (
    id uuid NOT NULL,
    product_id uuid NOT NULL,
    company_id uuid,
    barcode text NOT NULL,
    barcode_type public."BarcodeType" DEFAULT 'INTERNAL'::public."BarcodeType" NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    supplier_id uuid,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.report_saved_filters (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    report_type text NOT NULL,
    name text NOT NULL,
    filter_json jsonb NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.restore_jobs (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    artifact_id uuid NOT NULL,
    mode public."RestoreMode" DEFAULT 'TENANT_REPLACE'::public."RestoreMode" NOT NULL,
    status public."RestoreJobStatus" DEFAULT 'PENDING'::public."RestoreJobStatus" NOT NULL,
    dry_run_report jsonb,
    confirmation_token text,
    error_message text,
    started_at timestamp(6) with time zone,
    completed_at timestamp(6) with time zone,
    created_by uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.rfq_header (
    id uuid NOT NULL,
    rfq_number text NOT NULL,
    rfq_date date NOT NULL,
    deadline date,
    title text NOT NULL,
    notes text,
    shop_id uuid NOT NULL,
    branding_mode public."BrandingMode" DEFAULT 'LIVE'::public."BrandingMode" NOT NULL,
    branding_snapshot jsonb,
    branding_version integer,
    template_version integer DEFAULT 1 NOT NULL,
    status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
    posted_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.rfq_items (
    id uuid NOT NULL,
    rfq_header_id uuid NOT NULL,
    product_id uuid,
    description text,
    quantity numeric(12,3) NOT NULL,
    uom text NOT NULL,
    specifications text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.rfq_suppliers (
    id uuid NOT NULL,
    rfq_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.sales_order_header (
    id uuid NOT NULL,
    so_number text NOT NULL,
    order_date date NOT NULL,
    expected_date date,
    customer_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    status public."SalesOrderStatus" DEFAULT 'DRAFT'::public."SalesOrderStatus" NOT NULL,
    fulfillment_status public."FulfillmentStatus" DEFAULT 'NONE'::public."FulfillmentStatus" NOT NULL,
    remarks text,
    currency text DEFAULT 'USD'::text NOT NULL,
    fx_rate_used numeric(18,8),
    discount_amount numeric(14,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
    total_value numeric(14,2),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
    branding_snapshot jsonb,
    branding_version integer,
    template_version integer DEFAULT 1 NOT NULL,
    gst_supply_type public."GstSupplyType" DEFAULT 'INTRA_STATE'::public."GstSupplyType" NOT NULL,
    subtotal_before_tax numeric(14,2) DEFAULT 0 NOT NULL,
    total_cgst numeric(14,2) DEFAULT 0 NOT NULL,
    total_sgst numeric(14,2) DEFAULT 0 NOT NULL,
    total_igst numeric(14,2) DEFAULT 0 NOT NULL,
    tenant_id uuid NOT NULL
);

CREATE TABLE public.sales_order_items (
    id uuid NOT NULL,
    so_header_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(12,3) NOT NULL,
    shipped_qty numeric(12,3) DEFAULT 0 NOT NULL,
    uom text NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    discount_amount numeric(14,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(7,4) DEFAULT 0 NOT NULL,
    tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
    line_value numeric(14,2) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    cgst_rate numeric(7,4) DEFAULT 0 NOT NULL,
    sgst_rate numeric(7,4) DEFAULT 0 NOT NULL,
    igst_rate numeric(7,4) DEFAULT 0 NOT NULL,
    tenant_id uuid NOT NULL
);

CREATE TABLE public.sales_quote_header (
    id uuid NOT NULL,
    quote_number text NOT NULL,
    quote_date date NOT NULL,
    valid_until date,
    customer_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    status public."SalesQuotationStatus" DEFAULT 'DRAFT'::public."SalesQuotationStatus" NOT NULL,
    branding_mode public."BrandingMode" DEFAULT 'LIVE'::public."BrandingMode" NOT NULL,
    branding_snapshot jsonb,
    branding_version integer,
    template_version integer DEFAULT 1 NOT NULL,
    sales_order_id uuid,
    portal_token text,
    remarks text,
    total_value numeric(14,2),
    customer_requested_total numeric(14,2),
    customer_request_note text,
    customer_responded_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.sales_quote_items (
    id uuid NOT NULL,
    quote_header_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(12,3) NOT NULL,
    uom text NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    line_value numeric(14,2) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.scan_logs (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    shop_id uuid,
    barcode text NOT NULL,
    product_id uuid,
    user_id uuid NOT NULL,
    action public."ScanAction" DEFAULT 'LOOKUP'::public."ScanAction" NOT NULL,
    result public."ScanResult" DEFAULT 'FOUND'::public."ScanResult" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source public."ScanSource" DEFAULT 'API'::public."ScanSource" NOT NULL,
    session_id uuid
);

CREATE TABLE public.stock_count_items (
    id uuid NOT NULL,
    session_id uuid NOT NULL,
    product_id uuid NOT NULL,
    counted_qty numeric(12,3) DEFAULT 0 NOT NULL,
    expected_qty numeric(12,3),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.stock_count_sessions (
    id uuid NOT NULL,
    session_number text NOT NULL,
    company_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    status public."StockCountStatus" DEFAULT 'OPEN'::public."StockCountStatus" NOT NULL,
    remarks text,
    started_by uuid NOT NULL,
    approved_by uuid,
    approved_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.stock_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    source_line_id uuid NOT NULL,
    qty_reserved numeric(12,3) NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_reservations_qty_reserved_check CHECK ((qty_reserved > (0)::numeric))
);

CREATE TABLE public.stock_transfer_header (
    id uuid NOT NULL,
    transfer_number text NOT NULL,
    transfer_date date NOT NULL,
    from_shop_id uuid NOT NULL,
    to_shop_id uuid NOT NULL,
    from_storage_location_id uuid,
    to_storage_location_id uuid,
    status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
    notes text,
    posted_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_via public."StockTransferCreatedVia" DEFAULT 'MANUAL'::public."StockTransferCreatedVia" NOT NULL,
    dispatched_at timestamp(6) with time zone,
    received_at timestamp(6) with time zone,
    dispatched_by uuid,
    received_by uuid
);

CREATE TABLE public.stock_transfer_item_lots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_item_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    quantity numeric(12,3) NOT NULL
);

CREATE TABLE public.stock_transfer_items (
    id uuid NOT NULL,
    transfer_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(12,3) NOT NULL,
    uom text NOT NULL
);

CREATE TABLE public.stock_transfer_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_id uuid NOT NULL,
    from_status public."DocumentStatus",
    to_status public."DocumentStatus" NOT NULL,
    changed_by uuid,
    changed_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    remarks text
);

CREATE TABLE public.subscription_invoices (
    id uuid NOT NULL,
    invoice_number text NOT NULL,
    company_id uuid NOT NULL,
    plan public."SubscriptionPlan" NOT NULL,
    billing_cycle public."BillingCycle" NOT NULL,
    amount_paise integer NOT NULL,
    tax_paise integer DEFAULT 0 NOT NULL,
    total_paise integer NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    gst_number text,
    billing_address_snapshot jsonb,
    issued_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pdf_storage_key text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.supplier_bill_header (
    id uuid NOT NULL,
    bill_number text NOT NULL,
    bill_date date NOT NULL,
    due_date date,
    shop_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    purchase_order_id uuid,
    goods_receipt_id uuid,
    status public."SupplierBillStatus" DEFAULT 'DRAFT'::public."SupplierBillStatus" NOT NULL,
    total_value numeric(14,2) NOT NULL,
    paid_value numeric(14,2) DEFAULT 0 NOT NULL,
    remarks text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
    branding_snapshot jsonb,
    branding_version integer,
    template_version integer DEFAULT 1 NOT NULL
);

CREATE TABLE public.supplier_bill_items (
    id uuid NOT NULL,
    bill_header_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(12,3) NOT NULL,
    uom text NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    line_value numeric(14,2) NOT NULL
);

CREATE TABLE public.supplier_payments (
    id uuid NOT NULL,
    payment_number text NOT NULL,
    payment_date date NOT NULL,
    supplier_bill_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    method text,
    reference text,
    remarks text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
    branding_snapshot jsonb,
    branding_version integer,
    template_version integer DEFAULT 1 NOT NULL
);

CREATE TABLE public.supplier_quote_header (
    id uuid NOT NULL,
    quote_number text NOT NULL,
    quote_date date NOT NULL,
    shop_id uuid NOT NULL,
    rfq_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    notes text,
    status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
    posted_at timestamp(6) with time zone,
    total_value numeric(14,2),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.supplier_quote_items (
    id uuid NOT NULL,
    quote_header_id uuid NOT NULL,
    rfq_item_id uuid,
    product_id uuid,
    description text,
    quantity numeric(12,3) NOT NULL,
    uom text NOT NULL,
    specifications text,
    unit_price numeric(12,2) NOT NULL,
    line_value numeric(14,2) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.supplier_return_images (
    id uuid NOT NULL,
    return_id uuid NOT NULL,
    return_item_id uuid,
    file_path text NOT NULL,
    public_url text NOT NULL,
    original_filename text NOT NULL,
    mime_type text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid
);

CREATE TABLE public.suppliers (
    id uuid NOT NULL,
    supplier_code text NOT NULL,
    supplier_name text NOT NULL,
    company_id uuid,
    tax_id text,
    vat_number text,
    rating integer DEFAULT 0 NOT NULL,
    categories text[] DEFAULT ARRAY[]::text[] NOT NULL,
    contact_person text,
    email text,
    phone text,
    street text,
    city text,
    state text,
    postal_code text,
    country text,
    payment_terms text,
    bank_name text,
    account_number text,
    routing_number text,
    iban text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp(6) with time zone
);

CREATE TABLE public.trusted_mfa_devices (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    ip text,
    user_agent text,
    last_used_at timestamp(6) with time zone,
    expires_at timestamp(6) with time zone NOT NULL,
    revoked_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.user_backup_codes (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    code_hash text NOT NULL,
    consumed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.user_channel_links (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    channel public."ChatChannel" DEFAULT 'WHATSAPP'::public."ChatChannel" NOT NULL,
    phone_number text NOT NULL,
    status public."ChannelLinkStatus" DEFAULT 'PENDING'::public."ChannelLinkStatus" NOT NULL,
    verified_at timestamp(6) with time zone,
    last_seen_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.whatsapp_devices (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    phone_number text NOT NULL,
    nickname text,
    device_type text,
    status public."WhatsAppDeviceStatus" DEFAULT 'ACTIVE'::public."WhatsAppDeviceStatus" NOT NULL,
    linked_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_seen_at timestamp(6) with time zone,
    revoked_at timestamp(6) with time zone,
    revoked_by_id uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.whatsapp_link_tokens (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    token_version text DEFAULT 'V1'::text NOT NULL,
    status public."LinkTokenStatus" DEFAULT 'ACTIVE'::public."LinkTokenStatus" NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    used_at timestamp(6) with time zone,
    linked_phone text,
    attempt_count integer DEFAULT 0 NOT NULL,
    generated_ip text,
    generated_user_agent text
);

CREATE TABLE public.whatsapp_verifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    phone_number text NOT NULL,
    otp_hash text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    consumed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- ========== INDEXES (All via CREATE INDEX IF NOT EXISTS) ==========

CREATE UNIQUE INDEX agent_task_steps_task_id_order_key ON public.agent_task_steps USING btree (task_id, "order");

CREATE INDEX IF NOT EXISTS agent_tasks_company_id_created_at_idx ON public.agent_tasks USING btree (company_id, created_at);

CREATE INDEX IF NOT EXISTS agent_tasks_conversation_id_status_idx ON public.agent_tasks USING btree (conversation_id, status);

CREATE UNIQUE INDEX agent_tasks_task_number_key ON public.agent_tasks USING btree (task_number);

CREATE UNIQUE INDEX ai_prompt_history_company_id_version_key ON public.ai_prompt_history USING btree (company_id, version);

CREATE UNIQUE INDEX ai_settings_company_id_key ON public.ai_settings USING btree (company_id);

CREATE INDEX IF NOT EXISTS ai_usage_logs_company_id_created_at_idx ON public.ai_usage_logs USING btree (company_id, created_at);

CREATE INDEX IF NOT EXISTS ai_usage_logs_conversation_id_idx ON public.ai_usage_logs USING btree (conversation_id);

CREATE INDEX IF NOT EXISTS alert_events_alert_type_triggered_at_idx ON public.alert_events USING btree (alert_type, triggered_at);

CREATE INDEX IF NOT EXISTS alert_events_shop_id_is_read_idx ON public.alert_events USING btree (shop_id, is_read);

CREATE INDEX IF NOT EXISTS approval_comments_approval_id_idx ON public.approval_comments USING btree (approval_id);

CREATE INDEX IF NOT EXISTS approval_escalations_approval_id_escalated_at_idx ON public.approval_escalations USING btree (approval_id, escalated_at);

CREATE INDEX IF NOT EXISTS approval_requests_approval_type_reference_id_idx ON public.approval_requests USING btree (approval_type, reference_id);

CREATE INDEX IF NOT EXISTS approval_requests_assigned_to_status_idx ON public.approval_requests USING btree (assigned_to, status);

CREATE INDEX IF NOT EXISTS approval_requests_company_id_status_created_at_idx ON public.approval_requests USING btree (company_id, status, created_at);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);

CREATE INDEX IF NOT EXISTS audit_logs_entity_type_entity_id_idx ON public.audit_logs USING btree (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS audit_logs_reason_created_at_idx ON public.audit_logs USING btree (reason, created_at);

CREATE INDEX IF NOT EXISTS audit_logs_request_id_idx ON public.audit_logs USING btree (request_id);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_created_at_idx ON public.audit_logs USING btree (user_id, created_at);

CREATE INDEX IF NOT EXISTS auth_challenges_expires_at_idx ON public.auth_challenges USING btree (expires_at);

CREATE INDEX IF NOT EXISTS auth_challenges_token_hash_idx ON public.auth_challenges USING btree (token_hash);

CREATE INDEX IF NOT EXISTS auth_challenges_user_id_idx ON public.auth_challenges USING btree (user_id);

CREATE UNIQUE INDEX backup_artifacts_backup_job_id_key ON public.backup_artifacts USING btree (backup_job_id);

CREATE INDEX IF NOT EXISTS backup_artifacts_company_id_created_at_idx ON public.backup_artifacts USING btree (company_id, created_at);

CREATE INDEX IF NOT EXISTS backup_jobs_company_id_created_at_idx ON public.backup_jobs USING btree (company_id, created_at);

CREATE UNIQUE INDEX backup_provider_credentials_company_id_provider_key ON public.backup_provider_credentials USING btree (company_id, provider);

CREATE INDEX IF NOT EXISTS barcode_audit_logs_barcode_id_idx ON public.barcode_audit_logs USING btree (barcode_id);

CREATE INDEX IF NOT EXISTS barcode_audit_logs_company_id_created_at_idx ON public.barcode_audit_logs USING btree (company_id, created_at);

CREATE INDEX IF NOT EXISTS barcode_audit_logs_product_id_idx ON public.barcode_audit_logs USING btree (product_id);

CREATE INDEX IF NOT EXISTS barcode_history_barcode_idx ON public.barcode_history USING btree (barcode);

CREATE INDEX IF NOT EXISTS barcode_history_company_id_created_at_idx ON public.barcode_history USING btree (company_id, created_at);

CREATE UNIQUE INDEX barcode_template_versions_template_name_version_key ON public.barcode_template_versions USING btree (template_name, version);

CREATE UNIQUE INDEX channel_accounts_channel_phone_number_id_key ON public.channel_accounts USING btree (channel, phone_number_id);

CREATE INDEX IF NOT EXISTS channel_accounts_company_id_idx ON public.channel_accounts USING btree (company_id);

CREATE UNIQUE INDEX companies_company_code_key ON public.companies USING btree (company_code);

CREATE UNIQUE INDEX company_engagement_snapshots_company_id_snapshot_date_key ON public.company_engagement_snapshots USING btree (company_id, snapshot_date);

CREATE INDEX IF NOT EXISTS company_engagement_snapshots_lifecycle_stage_idx ON public.company_engagement_snapshots USING btree (lifecycle_stage);

CREATE INDEX IF NOT EXISTS company_engagement_snapshots_snapshot_date_idx ON public.company_engagement_snapshots USING btree (snapshot_date);

CREATE INDEX IF NOT EXISTS company_health_score_configs_company_idx ON public.company_health_score_configs USING btree (company_id);

CREATE INDEX IF NOT EXISTS company_settings_company_id_idx ON public.company_settings USING btree (company_id);

CREATE UNIQUE INDEX company_settings_company_id_key_key ON public.company_settings USING btree (company_id, key);

CREATE UNIQUE INDEX contract_header_contract_number_key ON public.contract_header USING btree (contract_number);

CREATE INDEX IF NOT EXISTS contract_header_shop_id_start_date_idx ON public.contract_header USING btree (shop_id, start_date);

CREATE INDEX IF NOT EXISTS contract_header_supplier_id_idx ON public.contract_header USING btree (supplier_id);

CREATE INDEX IF NOT EXISTS contract_items_contract_id_idx ON public.contract_items USING btree (contract_id);

CREATE INDEX IF NOT EXISTS conversations_company_id_last_message_at_idx ON public.conversations USING btree (company_id, last_message_at);

CREATE INDEX IF NOT EXISTS conversations_user_channel_link_id_status_idx ON public.conversations USING btree (user_channel_link_id, status);

CREATE INDEX IF NOT EXISTS cost_layers_qty_remaining_idx ON public.cost_layers USING btree (qty_remaining);

CREATE INDEX IF NOT EXISTS cost_layers_shop_id_product_id_created_at_idx ON public.cost_layers USING btree (shop_id, product_id, created_at);

CREATE UNIQUE INDEX credit_notes_credit_number_key ON public.credit_notes USING btree (credit_number);

CREATE INDEX IF NOT EXISTS credit_notes_customer_id_idx ON public.credit_notes USING btree (customer_id);

CREATE UNIQUE INDEX credit_notes_return_id_key ON public.credit_notes USING btree (return_id);

CREATE INDEX IF NOT EXISTS credit_notes_shop_id_credit_date_idx ON public.credit_notes USING btree (shop_id, credit_date);

CREATE INDEX IF NOT EXISTS customer_return_items_return_id_idx ON public.customer_return_items USING btree (return_id);

CREATE INDEX IF NOT EXISTS customer_returns_customer_id_idx ON public.customer_returns USING btree (customer_id);

CREATE INDEX IF NOT EXISTS customer_returns_invoice_id_idx ON public.customer_returns USING btree (invoice_id);

CREATE UNIQUE INDEX customer_returns_return_number_key ON public.customer_returns USING btree (return_number);

CREATE INDEX IF NOT EXISTS customer_returns_shop_id_return_date_idx ON public.customer_returns USING btree (shop_id, return_date);

CREATE UNIQUE INDEX customers_shop_id_customer_code_key ON public.customers USING btree (shop_id, customer_code);

CREATE INDEX IF NOT EXISTS customers_shop_id_customer_name_idx ON public.customers USING btree (shop_id, customer_name);

CREATE UNIQUE INDEX damaged_stock_damage_number_key ON public.damaged_stock USING btree (damage_number);

CREATE INDEX IF NOT EXISTS damaged_stock_shop_id_damage_date_idx ON public.damaged_stock USING btree (shop_id, damage_date);

CREATE INDEX IF NOT EXISTS damaged_stock_shop_id_product_id_idx ON public.damaged_stock USING btree (shop_id, product_id);

CREATE INDEX IF NOT EXISTS damaged_stock_status_damage_date_idx ON public.damaged_stock USING btree (status, damage_date);

CREATE UNIQUE INDEX data_retention_config_entity_key ON public.data_retention_config USING btree (entity);

CREATE INDEX IF NOT EXISTS device_registrations_company_id_platform_idx ON public.device_registrations USING btree (company_id, platform);

CREATE INDEX IF NOT EXISTS device_registrations_is_active_last_active_at_idx ON public.device_registrations USING btree (is_active, last_active_at);

CREATE UNIQUE INDEX device_registrations_user_id_device_id_key ON public.device_registrations USING btree (user_id, device_id);

CREATE UNIQUE INDEX document_branding_company_id_document_type_key ON public.document_branding USING btree (company_id, document_type);

CREATE INDEX IF NOT EXISTS document_branding_company_id_idx ON public.document_branding USING btree (company_id);

CREATE INDEX IF NOT EXISTS document_email_outbox_entity_type_entity_id_created_at_idx ON public.document_email_outbox USING btree (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS document_email_outbox_status_next_retry_at_idx ON public.document_email_outbox USING btree (status, next_retry_at);

CREATE UNIQUE INDEX document_sequences_doc_type_shop_id_year_month_key ON public.document_sequences USING btree (doc_type, shop_id, year_month);

CREATE UNIQUE INDEX document_series_config_company_default_unique ON public.document_series_config USING btree (company_id, doc_type) WHERE (shop_id IS NULL);

CREATE INDEX IF NOT EXISTS document_series_config_company_id_doc_type_idx ON public.document_series_config USING btree (company_id, doc_type);

CREATE INDEX IF NOT EXISTS document_series_config_company_id_shop_id_doc_type_idx ON public.document_series_config USING btree (company_id, shop_id, doc_type);

CREATE UNIQUE INDEX document_series_config_shop_override_unique ON public.document_series_config USING btree (company_id, shop_id, doc_type) WHERE (shop_id IS NOT NULL);

CREATE UNIQUE INDEX email_delivery_log_template_entity_recipient_key ON public.email_delivery_log USING btree (template_id, entity_type, entity_id, recipient);

CREATE UNIQUE INDEX email_sender_domains_company_id_domain_key ON public.email_sender_domains USING btree (company_id, domain);

CREATE UNIQUE INDEX email_sender_identities_company_id_email_key ON public.email_sender_identities USING btree (company_id, email);

CREATE INDEX IF NOT EXISTS email_sender_identities_company_id_is_primary_idx ON public.email_sender_identities USING btree (company_id, is_primary);

CREATE INDEX IF NOT EXISTS email_sender_verifications_sender_id_expires_at_idx ON public.email_sender_verifications USING btree (sender_id, expires_at);

CREATE INDEX IF NOT EXISTS eway_bill_items_eway_bill_id_idx ON public.eway_bill_items USING btree (eway_bill_id);

CREATE INDEX IF NOT EXISTS eway_bills_customer_id_idx ON public.eway_bills USING btree (customer_id);

CREATE INDEX IF NOT EXISTS eway_bills_invoice_id_idx ON public.eway_bills USING btree (invoice_id);

CREATE INDEX IF NOT EXISTS eway_bills_shop_id_document_date_idx ON public.eway_bills USING btree (shop_id, document_date);

CREATE INDEX IF NOT EXISTS eway_bills_shop_id_status_idx ON public.eway_bills USING btree (shop_id, status);

CREATE INDEX IF NOT EXISTS fx_rates_base_quote_as_of_idx ON public.fx_rates USING btree (base, quote, as_of);

CREATE UNIQUE INDEX fx_rates_base_quote_as_of_key ON public.fx_rates USING btree (base, quote, as_of);

CREATE UNIQUE INDEX goods_issue_header_gi_number_key ON public.goods_issue_header USING btree (gi_number);

CREATE INDEX IF NOT EXISTS goods_issue_header_shop_id_gi_date_idx ON public.goods_issue_header USING btree (shop_id, gi_date);

CREATE INDEX IF NOT EXISTS goods_issue_header_shop_id_status_gi_date_idx ON public.goods_issue_header USING btree (shop_id, status, gi_date);

CREATE UNIQUE INDEX goods_issue_item_lots_gi_item_id_lot_id_key ON public.goods_issue_item_lots USING btree (gi_item_id, lot_id);

CREATE INDEX IF NOT EXISTS goods_issue_item_lots_lot_id_idx ON public.goods_issue_item_lots USING btree (lot_id);

CREATE INDEX IF NOT EXISTS goods_issue_items_gi_header_id_idx ON public.goods_issue_items USING btree (gi_header_id);

CREATE INDEX IF NOT EXISTS goods_issue_items_product_id_idx ON public.goods_issue_items USING btree (product_id);

CREATE UNIQUE INDEX goods_receipt_header_gr_number_key ON public.goods_receipt_header USING btree (gr_number);

CREATE INDEX IF NOT EXISTS goods_receipt_header_purchase_order_id_idx ON public.goods_receipt_header USING btree (purchase_order_id);

CREATE INDEX IF NOT EXISTS goods_receipt_header_shop_id_gr_date_idx ON public.goods_receipt_header USING btree (shop_id, gr_date);

CREATE INDEX IF NOT EXISTS goods_receipt_header_shop_id_status_gr_date_idx ON public.goods_receipt_header USING btree (shop_id, status, gr_date);

CREATE INDEX IF NOT EXISTS goods_receipt_items_gr_header_id_idx ON public.goods_receipt_items USING btree (gr_header_id);

CREATE INDEX IF NOT EXISTS goods_receipt_items_product_id_idx ON public.goods_receipt_items USING btree (product_id);

CREATE INDEX IF NOT EXISTS goods_receipt_items_storage_location_id_idx ON public.goods_receipt_items USING btree (storage_location_id);

CREATE INDEX IF NOT EXISTS idempotency_keys_expires_at_idx ON public.idempotency_keys USING btree (expires_at);

CREATE UNIQUE INDEX idempotency_keys_key_key ON public.idempotency_keys USING btree (key);

CREATE INDEX IF NOT EXISTS idempotency_keys_scope_idx ON public.idempotency_keys USING btree (scope);

CREATE INDEX IF NOT EXISTS idx_document_registry_cache_lookup ON public.document_registry USING btree (tenant_id, document_type, reference_id, template_version, status);

CREATE INDEX IF NOT EXISTS idx_document_registry_created ON public.document_registry USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_registry_expires ON public.document_registry USING btree (expires_at);

CREATE INDEX IF NOT EXISTS idx_document_registry_job ON public.document_registry USING btree (job_id);

CREATE INDEX IF NOT EXISTS idx_document_registry_metadata ON public.document_registry USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_document_registry_reference ON public.document_registry USING btree (reference_id);

CREATE INDEX IF NOT EXISTS idx_document_registry_render_duration ON public.document_registry USING btree (render_duration_ms) WHERE (render_duration_ms IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_document_registry_rendered_at ON public.document_registry USING btree (rendered_at DESC) WHERE (rendered_at IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_document_registry_status ON public.document_registry USING btree (status);

CREATE INDEX IF NOT EXISTS idx_document_registry_tenant_type ON public.document_registry USING btree (tenant_id, document_type);

CREATE INDEX IF NOT EXISTS idx_goods_issue_header_reversed_by ON public.goods_issue_header USING btree (reversed_by);

CREATE INDEX IF NOT EXISTS idx_goods_issue_items_so_line_id ON public.goods_issue_items USING btree (so_line_id);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_header_reversed_by ON public.goods_receipt_header USING btree (reversed_by);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_lot_id ON public.goods_receipt_items USING btree (lot_id);

CREATE INDEX IF NOT EXISTS idx_pdf_jobs_created ON public.pdf_jobs USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_jobs_status ON public.pdf_jobs USING btree (status);

CREATE INDEX IF NOT EXISTS idx_pdf_jobs_tenant ON public.pdf_jobs USING btree (tenant_id);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON public.stock_reservations USING btree (product_id, shop_id);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_source ON public.stock_reservations USING btree (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON public.stock_reservations USING btree (status);

CREATE INDEX IF NOT EXISTS idx_stock_summary_reserved ON public.stock_summary USING btree (reserved_qty);

CREATE UNIQUE INDEX inventory_exceptions_dedup_idx ON public.inventory_exceptions USING btree (company_id, type, entity_type, entity_id, status);

CREATE INDEX IF NOT EXISTS inventory_exceptions_severity_idx ON public.inventory_exceptions USING btree (company_id, severity, status);

CREATE INDEX IF NOT EXISTS inventory_exceptions_status_idx ON public.inventory_exceptions USING btree (company_id, status, type);

CREATE INDEX IF NOT EXISTS inventory_exceptions_time_idx ON public.inventory_exceptions USING btree (company_id, last_detected_at);

CREATE UNIQUE INDEX inventory_lot_alerts_lot_id_threshold_key ON public.inventory_lot_alerts USING btree (lot_id, threshold);

CREATE INDEX IF NOT EXISTS inventory_lots_company_id_status_expiry_date_idx ON public.inventory_lots USING btree (company_id, status, expiry_date);

CREATE UNIQUE INDEX inventory_lots_shop_id_product_id_lot_number_key ON public.inventory_lots USING btree (shop_id, product_id, lot_number);

CREATE INDEX IF NOT EXISTS inventory_lots_shop_id_product_id_status_expiry_date_idx ON public.inventory_lots USING btree (shop_id, product_id, status, expiry_date);

CREATE INDEX IF NOT EXISTS invoice_header_customer_id_idx ON public.invoice_header USING btree (customer_id);

CREATE UNIQUE INDEX invoice_header_invoice_number_key ON public.invoice_header USING btree (invoice_number);

CREATE INDEX IF NOT EXISTS invoice_header_sales_order_id_idx ON public.invoice_header USING btree (sales_order_id);

CREATE INDEX IF NOT EXISTS invoice_header_shop_id_invoice_date_idx ON public.invoice_header USING btree (shop_id, invoice_date);

CREATE INDEX IF NOT EXISTS invoice_header_shop_id_status_invoice_date_idx ON public.invoice_header USING btree (shop_id, status, invoice_date);

CREATE INDEX IF NOT EXISTS job_failures_job_id_idx ON public.job_failures USING btree (job_id);

CREATE INDEX IF NOT EXISTS job_failures_queue_failed_at_idx ON public.job_failures USING btree (queue, failed_at);

CREATE INDEX IF NOT EXISTS lifecycle_campaign_enrollments_campaign_key_idx ON public.lifecycle_campaign_enrollments USING btree (campaign_key);

CREATE UNIQUE INDEX lifecycle_campaign_enrollments_company_id_campaign_key_key ON public.lifecycle_campaign_enrollments USING btree (company_id, campaign_key);

CREATE INDEX IF NOT EXISTS lifecycle_campaign_enrollments_scheduled_for_idx ON public.lifecycle_campaign_enrollments USING btree (scheduled_for);

CREATE INDEX IF NOT EXISTS lifecycle_campaign_enrollments_status_idx ON public.lifecycle_campaign_enrollments USING btree (status);

CREATE INDEX IF NOT EXISTS media_assets_branding_profile_id_idx ON public.media_assets USING btree (branding_profile_id);

CREATE INDEX IF NOT EXISTS media_assets_company_id_idx ON public.media_assets USING btree (company_id);

CREATE INDEX IF NOT EXISTS media_assets_shop_id_idx ON public.media_assets USING btree (shop_id);

CREATE INDEX IF NOT EXISTS media_assets_type_active_idx ON public.media_assets USING btree (type, active);

CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx ON public.messages USING btree (conversation_id, created_at);

CREATE UNIQUE INDEX messages_wa_message_id_key ON public.messages USING btree (wa_message_id);

CREATE INDEX IF NOT EXISTS notification_audit_logs_company_id_action_created_at_idx ON public.notification_audit_logs USING btree (company_id, action, created_at);

CREATE INDEX IF NOT EXISTS notification_audit_logs_user_id_action_idx ON public.notification_audit_logs USING btree (user_id, action);

CREATE INDEX IF NOT EXISTS notification_deliveries_company_id_channel_state_idx ON public.notification_deliveries USING btree (company_id, channel, state);

CREATE INDEX IF NOT EXISTS notification_deliveries_event_id_idx ON public.notification_deliveries USING btree (event_id);

CREATE UNIQUE INDEX notification_deliveries_event_id_recipient_user_id_channel_a_ke ON public.notification_deliveries USING btree (event_id, recipient_user_id, channel, attempt);

CREATE INDEX IF NOT EXISTS notification_deliveries_recipient_user_id_created_at_idx ON public.notification_deliveries USING btree (recipient_user_id, created_at);

CREATE INDEX IF NOT EXISTS notification_preferences_company_id_idx ON public.notification_preferences USING btree (company_id);

CREATE UNIQUE INDEX notification_preferences_user_id_key ON public.notification_preferences USING btree (user_id);

CREATE UNIQUE INDEX notification_rules_company_id_event_type_key ON public.notification_rules USING btree (company_id, event_type);

CREATE INDEX IF NOT EXISTS notification_rules_company_id_idx ON public.notification_rules USING btree (company_id);

CREATE UNIQUE INDEX notification_templates_company_id_event_type_channel_key ON public.notification_templates USING btree (company_id, event_type, channel);

CREATE INDEX IF NOT EXISTS notification_templates_company_id_idx ON public.notification_templates USING btree (company_id);

CREATE INDEX IF NOT EXISTS notifications_company_id_created_at_idx ON public.notifications USING btree (company_id, created_at);

CREATE INDEX IF NOT EXISTS notifications_is_read_expires_at_idx ON public.notifications USING btree (is_read, expires_at);

CREATE INDEX IF NOT EXISTS notifications_type_priority_idx ON public.notifications USING btree (type, priority);

CREATE INDEX IF NOT EXISTS notifications_user_id_status_created_at_idx ON public.notifications USING btree (user_id, status, created_at);

CREATE INDEX IF NOT EXISTS outbox_events_company_id_idx ON public.outbox_events USING btree (company_id);

CREATE UNIQUE INDEX outbox_events_event_id_key ON public.outbox_events USING btree (event_id);

CREATE INDEX IF NOT EXISTS outbox_events_event_type_event_version_idx ON public.outbox_events USING btree (event_type, event_version);

CREATE INDEX IF NOT EXISTS outbox_events_status_created_at_idx ON public.outbox_events USING btree (status, created_at);

CREATE INDEX IF NOT EXISTS password_reset_requests_email_idx ON public.password_reset_requests USING btree (email);

CREATE INDEX IF NOT EXISTS password_reset_requests_expires_at_idx ON public.password_reset_requests USING btree (expires_at);

CREATE INDEX IF NOT EXISTS password_reset_requests_link_token_hash_idx ON public.password_reset_requests USING btree (link_token_hash);

CREATE INDEX IF NOT EXISTS password_reset_requests_user_id_idx ON public.password_reset_requests USING btree (user_id);

CREATE INDEX IF NOT EXISTS payment_receipts_invoice_id_idx ON public.payment_receipts USING btree (invoice_id);

CREATE UNIQUE INDEX payment_receipts_receipt_number_key ON public.payment_receipts USING btree (receipt_number);

CREATE INDEX IF NOT EXISTS payment_receipts_shop_id_receipt_date_idx ON public.payment_receipts USING btree (shop_id, receipt_date);

CREATE INDEX IF NOT EXISTS platform_audit_log_created_at_idx ON public.platform_audit_log USING btree (created_at);

CREATE INDEX IF NOT EXISTS platform_audit_log_entity_type_entity_id_idx ON public.platform_audit_log USING btree (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS platform_audit_log_user_id_created_at_idx ON public.platform_audit_log USING btree (user_id, created_at);

CREATE INDEX IF NOT EXISTS platform_notification_reads_admin_email_idx ON public.platform_notification_reads USING btree (admin_email);

CREATE UNIQUE INDEX platform_notification_reads_notification_id_admin_email_key ON public.platform_notification_reads USING btree (notification_id, admin_email);

CREATE INDEX IF NOT EXISTS platform_notifications_category_created_at_idx ON public.platform_notifications USING btree (category, created_at);

CREATE INDEX IF NOT EXISTS platform_notifications_created_at_idx ON public.platform_notifications USING btree (created_at);

CREATE INDEX IF NOT EXISTS platform_notifications_notification_key_idx ON public.platform_notifications USING btree (notification_key);

CREATE INDEX IF NOT EXISTS po_cancel_verifications_expires_at_idx ON public.po_cancel_verifications USING btree (expires_at);

CREATE INDEX IF NOT EXISTS po_cancel_verifications_po_id_user_id_idx ON public.po_cancel_verifications USING btree (po_id, user_id);

CREATE UNIQUE INDEX product_barcodes_company_id_barcode_key ON public.product_barcodes USING btree (company_id, barcode);

CREATE INDEX IF NOT EXISTS product_barcodes_supplier_id_idx ON public.product_barcodes USING btree (supplier_id);

CREATE UNIQUE INDEX product_plants_product_id_shop_id_key ON public.product_plants USING btree (product_id, shop_id);

CREATE INDEX IF NOT EXISTS product_plants_shop_id_idx ON public.product_plants USING btree (shop_id);

CREATE INDEX IF NOT EXISTS product_plants_storage_location_id_idx ON public.product_plants USING btree (storage_location_id);

CREATE INDEX IF NOT EXISTS product_specifications_product_id_sort_order_idx ON public.product_specifications USING btree (product_id, sort_order);

CREATE INDEX IF NOT EXISTS products_description_fts_idx ON public.products USING gin (to_tsvector('english'::regconfig, ((COALESCE(product_code, ''::text) || ' '::text) || COALESCE(description, ''::text))));

CREATE UNIQUE INDEX products_product_code_key ON public.products USING btree (product_code);

CREATE INDEX IF NOT EXISTS purchase_order_header_contract_id_idx ON public.purchase_order_header USING btree (contract_id);

CREATE UNIQUE INDEX purchase_order_header_po_number_key ON public.purchase_order_header USING btree (po_number);

CREATE INDEX IF NOT EXISTS purchase_order_header_rfq_id_idx ON public.purchase_order_header USING btree (rfq_id);

CREATE INDEX IF NOT EXISTS purchase_order_header_shop_id_po_date_idx ON public.purchase_order_header USING btree (shop_id, po_date);

CREATE INDEX IF NOT EXISTS purchase_order_header_shop_id_status_idx ON public.purchase_order_header USING btree (shop_id, status);

CREATE INDEX IF NOT EXISTS purchase_order_items_po_header_id_idx ON public.purchase_order_items USING btree (po_header_id);

CREATE INDEX IF NOT EXISTS purchase_order_items_product_id_idx ON public.purchase_order_items USING btree (product_id);

CREATE INDEX IF NOT EXISTS purchase_order_items_rfq_item_id_idx ON public.purchase_order_items USING btree (rfq_item_id);

CREATE INDEX IF NOT EXISTS report_saved_filters_user_id_report_type_idx ON public.report_saved_filters USING btree (user_id, report_type);

CREATE INDEX IF NOT EXISTS restore_jobs_company_id_created_at_idx ON public.restore_jobs USING btree (company_id, created_at);

CREATE UNIQUE INDEX rfq_header_rfq_number_key ON public.rfq_header USING btree (rfq_number);

CREATE INDEX IF NOT EXISTS rfq_header_shop_id_rfq_date_idx ON public.rfq_header USING btree (shop_id, rfq_date);

CREATE INDEX IF NOT EXISTS rfq_items_rfq_header_id_idx ON public.rfq_items USING btree (rfq_header_id);

CREATE UNIQUE INDEX rfq_suppliers_rfq_id_supplier_id_key ON public.rfq_suppliers USING btree (rfq_id, supplier_id);

CREATE INDEX IF NOT EXISTS rfq_suppliers_supplier_id_idx ON public.rfq_suppliers USING btree (supplier_id);

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);

CREATE INDEX IF NOT EXISTS sales_order_header_customer_id_idx ON public.sales_order_header USING btree (customer_id);

CREATE INDEX IF NOT EXISTS sales_order_header_shop_id_fulfillment_status_idx ON public.sales_order_header USING btree (shop_id, fulfillment_status);

CREATE INDEX IF NOT EXISTS sales_order_header_shop_id_order_date_idx ON public.sales_order_header USING btree (shop_id, order_date);

CREATE UNIQUE INDEX sales_order_header_so_number_key ON public.sales_order_header USING btree (so_number);

CREATE INDEX IF NOT EXISTS sales_order_items_so_header_id_idx ON public.sales_order_items USING btree (so_header_id);

CREATE INDEX IF NOT EXISTS sales_quote_header_customer_id_idx ON public.sales_quote_header USING btree (customer_id);

CREATE UNIQUE INDEX sales_quote_header_portal_token_key ON public.sales_quote_header USING btree (portal_token);

CREATE UNIQUE INDEX sales_quote_header_quote_number_key ON public.sales_quote_header USING btree (quote_number);

CREATE UNIQUE INDEX sales_quote_header_sales_order_id_key ON public.sales_quote_header USING btree (sales_order_id);

CREATE INDEX IF NOT EXISTS sales_quote_header_shop_id_quote_date_idx ON public.sales_quote_header USING btree (shop_id, quote_date);

CREATE INDEX IF NOT EXISTS sales_quote_header_status_idx ON public.sales_quote_header USING btree (status);

CREATE INDEX IF NOT EXISTS sales_quote_items_quote_header_id_idx ON public.sales_quote_items USING btree (quote_header_id);

CREATE INDEX IF NOT EXISTS scan_logs_barcode_idx ON public.scan_logs USING btree (barcode);

CREATE INDEX IF NOT EXISTS scan_logs_company_id_created_at_idx ON public.scan_logs USING btree (company_id, created_at);

CREATE INDEX IF NOT EXISTS scan_logs_product_id_idx ON public.scan_logs USING btree (product_id);

CREATE INDEX IF NOT EXISTS scan_logs_session_id_idx ON public.scan_logs USING btree (session_id);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON public.sessions USING btree (expires_at);

CREATE INDEX IF NOT EXISTS sessions_user_id_revoked_at_idx ON public.sessions USING btree (user_id, revoked_at);

CREATE UNIQUE INDEX shops_shop_number_key ON public.shops USING btree (shop_number);

CREATE INDEX IF NOT EXISTS signup_verifications_email_idx ON public.signup_verifications USING btree (email);

CREATE INDEX IF NOT EXISTS signup_verifications_expires_at_idx ON public.signup_verifications USING btree (expires_at);

CREATE INDEX IF NOT EXISTS signup_verifications_session_token_hash_idx ON public.signup_verifications USING btree (session_token_hash);

CREATE INDEX IF NOT EXISTS stock_count_items_product_id_idx ON public.stock_count_items USING btree (product_id);

CREATE UNIQUE INDEX stock_count_items_session_id_product_id_key ON public.stock_count_items USING btree (session_id, product_id);

CREATE INDEX IF NOT EXISTS stock_count_sessions_company_id_status_idx ON public.stock_count_sessions USING btree (company_id, status);

CREATE UNIQUE INDEX stock_count_sessions_session_number_key ON public.stock_count_sessions USING btree (session_number);

CREATE INDEX IF NOT EXISTS stock_count_sessions_shop_id_idx ON public.stock_count_sessions USING btree (shop_id);

CREATE UNIQUE INDEX stock_ledger_idempotency_key_key ON public.stock_ledger USING btree (idempotency_key);

CREATE INDEX IF NOT EXISTS stock_ledger_shop_id_product_id_transaction_date_idx ON public.stock_ledger USING btree (shop_id, product_id, transaction_date);

CREATE UNIQUE INDEX stock_summary_shop_id_product_id_key ON public.stock_summary USING btree (shop_id, product_id);

CREATE INDEX IF NOT EXISTS stock_transfer_header_from_shop_id_transfer_date_idx ON public.stock_transfer_header USING btree (from_shop_id, transfer_date);

CREATE INDEX IF NOT EXISTS stock_transfer_header_status_idx ON public.stock_transfer_header USING btree (status);

CREATE INDEX IF NOT EXISTS stock_transfer_header_to_shop_id_transfer_date_idx ON public.stock_transfer_header USING btree (to_shop_id, transfer_date);

CREATE UNIQUE INDEX stock_transfer_header_transfer_number_key ON public.stock_transfer_header USING btree (transfer_number);

CREATE INDEX IF NOT EXISTS stock_transfer_item_lots_lot_id_idx ON public.stock_transfer_item_lots USING btree (lot_id);

CREATE UNIQUE INDEX stock_transfer_item_lots_transfer_item_id_lot_id_key ON public.stock_transfer_item_lots USING btree (transfer_item_id, lot_id);

CREATE INDEX IF NOT EXISTS stock_transfer_items_transfer_id_idx ON public.stock_transfer_items USING btree (transfer_id);

CREATE INDEX IF NOT EXISTS stock_transfer_status_history_transfer_id_changed_at_idx ON public.stock_transfer_status_history USING btree (transfer_id, changed_at);

CREATE INDEX IF NOT EXISTS storage_locations_shop_id_code_idx ON public.storage_locations USING btree (shop_id, code);

CREATE UNIQUE INDEX storage_locations_shop_id_code_key ON public.storage_locations USING btree (shop_id, code);

CREATE INDEX IF NOT EXISTS subscription_invoices_company_id_idx ON public.subscription_invoices USING btree (company_id);

CREATE UNIQUE INDEX subscription_invoices_invoice_number_key ON public.subscription_invoices USING btree (invoice_number);

CREATE INDEX IF NOT EXISTS subscription_invoices_issued_at_idx ON public.subscription_invoices USING btree (issued_at);

CREATE INDEX IF NOT EXISTS subscription_payments_company_id_idx ON public.subscription_payments USING btree (company_id);

CREATE INDEX IF NOT EXISTS subscription_payments_invoice_id_idx ON public.subscription_payments USING btree (invoice_id);

CREATE UNIQUE INDEX subscription_payments_razorpay_order_id_key ON public.subscription_payments USING btree (razorpay_order_id);

CREATE UNIQUE INDEX subscription_payments_razorpay_payment_id_key ON public.subscription_payments USING btree (razorpay_payment_id);

CREATE UNIQUE INDEX supplier_bill_header_bill_number_key ON public.supplier_bill_header USING btree (bill_number);

CREATE INDEX IF NOT EXISTS supplier_bill_header_goods_receipt_id_idx ON public.supplier_bill_header USING btree (goods_receipt_id);

CREATE INDEX IF NOT EXISTS supplier_bill_header_purchase_order_id_idx ON public.supplier_bill_header USING btree (purchase_order_id);

CREATE INDEX IF NOT EXISTS supplier_bill_header_shop_id_bill_date_idx ON public.supplier_bill_header USING btree (shop_id, bill_date);

CREATE INDEX IF NOT EXISTS supplier_bill_header_shop_id_status_bill_date_idx ON public.supplier_bill_header USING btree (shop_id, status, bill_date);

CREATE INDEX IF NOT EXISTS supplier_bill_header_supplier_id_idx ON public.supplier_bill_header USING btree (supplier_id);

CREATE INDEX IF NOT EXISTS supplier_bill_items_bill_header_id_idx ON public.supplier_bill_items USING btree (bill_header_id);

CREATE UNIQUE INDEX supplier_payments_payment_number_key ON public.supplier_payments USING btree (payment_number);

CREATE INDEX IF NOT EXISTS supplier_payments_shop_id_payment_date_idx ON public.supplier_payments USING btree (shop_id, payment_date);

CREATE INDEX IF NOT EXISTS supplier_payments_supplier_bill_id_idx ON public.supplier_payments USING btree (supplier_bill_id);

CREATE UNIQUE INDEX supplier_quote_header_quote_number_key ON public.supplier_quote_header USING btree (quote_number);

CREATE INDEX IF NOT EXISTS supplier_quote_header_rfq_id_supplier_id_idx ON public.supplier_quote_header USING btree (rfq_id, supplier_id);

CREATE INDEX IF NOT EXISTS supplier_quote_header_shop_id_quote_date_idx ON public.supplier_quote_header USING btree (shop_id, quote_date);

CREATE INDEX IF NOT EXISTS supplier_quote_items_quote_header_id_idx ON public.supplier_quote_items USING btree (quote_header_id);

CREATE INDEX IF NOT EXISTS supplier_quote_items_rfq_item_id_idx ON public.supplier_quote_items USING btree (rfq_item_id);

CREATE INDEX IF NOT EXISTS supplier_return_images_return_id_idx ON public.supplier_return_images USING btree (return_id);

CREATE INDEX IF NOT EXISTS supplier_return_images_return_item_id_idx ON public.supplier_return_images USING btree (return_item_id);

CREATE INDEX IF NOT EXISTS supplier_return_items_goods_receipt_item_id_idx ON public.supplier_return_items USING btree (goods_receipt_item_id);

CREATE INDEX IF NOT EXISTS supplier_return_items_return_id_idx ON public.supplier_return_items USING btree (return_id);

CREATE INDEX IF NOT EXISTS supplier_returns_goods_receipt_id_idx ON public.supplier_returns USING btree (goods_receipt_id);

CREATE INDEX IF NOT EXISTS supplier_returns_purchase_order_id_idx ON public.supplier_returns USING btree (purchase_order_id);

CREATE UNIQUE INDEX supplier_returns_return_number_key ON public.supplier_returns USING btree (return_number);

CREATE INDEX IF NOT EXISTS supplier_returns_shop_id_return_date_idx ON public.supplier_returns USING btree (shop_id, return_date);

CREATE INDEX IF NOT EXISTS supplier_returns_supplier_id_idx ON public.supplier_returns USING btree (supplier_id);

CREATE INDEX IF NOT EXISTS suppliers_company_id_idx ON public.suppliers USING btree (company_id);

CREATE INDEX IF NOT EXISTS suppliers_deleted_at_idx ON public.suppliers USING btree (deleted_at);

CREATE UNIQUE INDEX suppliers_supplier_code_key ON public.suppliers USING btree (supplier_code);

CREATE INDEX IF NOT EXISTS suppliers_supplier_name_idx ON public.suppliers USING btree (supplier_name);

CREATE UNIQUE INDEX system_settings_key_key ON public.system_settings USING btree (key);

CREATE UNIQUE INDEX trusted_mfa_devices_token_hash_key ON public.trusted_mfa_devices USING btree (token_hash);

CREATE INDEX IF NOT EXISTS trusted_mfa_devices_user_id_expires_at_revoked_at_idx ON public.trusted_mfa_devices USING btree (user_id, expires_at, revoked_at);

CREATE INDEX IF NOT EXISTS user_backup_codes_user_id_consumed_at_idx ON public.user_backup_codes USING btree (user_id, consumed_at);

CREATE UNIQUE INDEX user_channel_links_channel_phone_number_key ON public.user_channel_links USING btree (channel, phone_number);

CREATE INDEX IF NOT EXISTS user_channel_links_company_id_idx ON public.user_channel_links USING btree (company_id);

CREATE INDEX IF NOT EXISTS user_channel_links_user_id_idx ON public.user_channel_links USING btree (user_id);

CREATE INDEX IF NOT EXISTS user_invitations_email_idx ON public.user_invitations USING btree (email);

CREATE INDEX IF NOT EXISTS user_invitations_expires_at_idx ON public.user_invitations USING btree (expires_at);

CREATE INDEX IF NOT EXISTS user_invitations_token_hash_idx ON public.user_invitations USING btree (token_hash);

CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON public.users USING btree (deleted_at);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE INDEX IF NOT EXISTS whatsapp_devices_company_id_idx ON public.whatsapp_devices USING btree (company_id);

CREATE UNIQUE INDEX whatsapp_devices_phone_number_key ON public.whatsapp_devices USING btree (phone_number);

CREATE INDEX IF NOT EXISTS whatsapp_devices_user_id_status_idx ON public.whatsapp_devices USING btree (user_id, status);

CREATE INDEX IF NOT EXISTS whatsapp_link_tokens_company_id_idx ON public.whatsapp_link_tokens USING btree (company_id);

CREATE INDEX IF NOT EXISTS whatsapp_link_tokens_status_expires_at_idx ON public.whatsapp_link_tokens USING btree (status, expires_at);

CREATE UNIQUE INDEX whatsapp_link_tokens_token_hash_key ON public.whatsapp_link_tokens USING btree (token_hash);

CREATE INDEX IF NOT EXISTS whatsapp_link_tokens_user_id_status_idx ON public.whatsapp_link_tokens USING btree (user_id, status);

CREATE INDEX IF NOT EXISTS whatsapp_verifications_expires_at_idx ON public.whatsapp_verifications USING btree (expires_at);

CREATE INDEX IF NOT EXISTS whatsapp_verifications_phone_number_idx ON public.whatsapp_verifications USING btree (phone_number);

CREATE INDEX IF NOT EXISTS whatsapp_verifications_user_id_idx ON public.whatsapp_verifications USING btree (user_id);

