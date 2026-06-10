export const EMAIL_NOTIFICATIONS_CONFIG_PREFIX = 'email_notifications_config_v1';

export const EMAIL_TEMPLATE_IDS = [
  'rfq_invite',
  'purchase_order_supplier',
  'sales_quotation_customer',
  'supplier_return_notice',
  'invoice_created',
  'payment_received',
  'payment_reminder',
  'sales_order_customer',
  'supplier_bill_issued',
  'supplier_payment_recorded',
  'goods_receipt_supplier',
  'user_invite',
  'goods_receipt_posted',
] as const;

export type EmailTemplateId = (typeof EMAIL_TEMPLATE_IDS)[number];

export type EmailTemplateConfig = {
  enabled: boolean;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  cc?: string[];
  bcc?: string[];
};

export type EmailInternalAlertConfig = {
  emailEnabled: boolean;
  recipients: string[];
};

export type EmailNotificationsConfig = {
  version: '1.0';
  templates: Record<EmailTemplateId, EmailTemplateConfig>;
  reminders: {
    paymentReminderEnabled: boolean;
    paymentReminderDaysBefore: number[];
  };
  internalAlerts: {
    lowStock: EmailInternalAlertConfig;
    rfqDeadline: EmailInternalAlertConfig;
    invoiceOverdue: EmailInternalAlertConfig;
    goodsReceiptPosted: EmailInternalAlertConfig;
  };
};

export type EmailTemplateDefinition = {
  id: EmailTemplateId;
  label: string;
  group: 'preferences' | 'procurement' | 'sales' | 'warehouse' | 'system' | 'internal';
  description: string;
  placeholders: string[];
  defaultSubject: string;
  defaultBodyText: string;
  defaultBodyHtml: string;
};

export const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[] = [
  {
    id: 'rfq_invite',
    label: 'RFQ Invite',
    group: 'procurement',
    description: 'Sent to suppliers when an RFQ is shared.',
    placeholders: ['supplier_name', 'rfq_number', 'rfq_title', 'deadline', 'portal_url', 'access_code', 'company_name'],
    defaultSubject: 'Request for Quotation {{rfq_number}} — {{company_name}}',
    defaultBodyText:
      'Hello {{supplier_name}},\n\nYou are invited to submit a quotation for {{rfq_number}} — {{rfq_title}}.\nDeadline: {{deadline}}\nPortal: {{portal_url}}\nAccess code: {{access_code}}\n\nThank you,\n{{company_name}}',
    defaultBodyHtml:
      '<p>Hello {{supplier_name}},</p><p>You are invited to submit a quotation for <strong>{{rfq_number}}</strong> — {{rfq_title}}.</p><p>Deadline: {{deadline}}<br/>Portal: <a href="{{portal_url}}">{{portal_url}}</a><br/>Access code: {{access_code}}</p><p>Thank you,<br/>{{company_name}}</p>',
  },
  {
    id: 'purchase_order_supplier',
    label: 'Purchase Order',
    group: 'procurement',
    description: 'Sent to the vendor when a purchase order is emailed.',
    placeholders: ['supplier_name', 'po_number', 'po_date', 'shop_name', 'total_value', 'company_name'],
    defaultSubject: 'Purchase Order {{po_number}} — {{company_name}}',
    defaultBodyText:
      'Hello {{supplier_name}},\n\nPlease find purchase order {{po_number}} dated {{po_date}} for {{shop_name}}.\nTotal: {{total_value}}\n\nThank you,\n{{company_name}}',
    defaultBodyHtml:
      '<p>Hello {{supplier_name}},</p><p>Please find purchase order <strong>{{po_number}}</strong> dated {{po_date}} for {{shop_name}}.</p><p>Total: {{total_value}}</p><p>Thank you,<br/>{{company_name}}</p>',
  },
  {
    id: 'sales_quotation_customer',
    label: 'Sales Quotation',
    group: 'sales',
    description: 'Sent to the customer when a quotation is shared.',
    placeholders: ['customer_name', 'quote_number', 'quote_date', 'valid_until', 'total_amount', 'company_name', 'portal_url'],
    defaultSubject: 'Sales Quotation {{quote_number}} — {{company_name}}',
    defaultBodyText:
      'Dear {{customer_name}},\n\nPlease find quotation {{quote_number}} dated {{quote_date}}.\nValid until: {{valid_until}}\nTotal: {{total_amount}}\n\nReview and respond online:\n{{portal_url}}\n\nThank you,\n{{company_name}}',
    defaultBodyHtml:
      '<p>Dear {{customer_name}},</p><p>Please find quotation <strong>{{quote_number}}</strong> dated {{quote_date}}.</p><p>Valid until: {{valid_until}}<br/>Total: {{total_amount}}</p><p style="margin:24px 0;text-align:center;"><a href="{{portal_url}}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">Review &amp; respond to quotation</a></p><p style="text-align:center;font-size:13px;color:#64748b;">Accept the quote or submit your target price — no login required.</p><p>Thank you,<br/>{{company_name}}</p>',
  },
  {
    id: 'supplier_return_notice',
    label: 'Supplier Return Notice',
    group: 'warehouse',
    description: 'Sent to the supplier when a goods return is submitted.',
    placeholders: ['supplier_name', 'return_number', 'gr_number', 'company_name'],
    defaultSubject: 'Goods Return {{return_number}} — {{company_name}}',
    defaultBodyText:
      'Hello {{supplier_name}},\n\nA goods return {{return_number}} has been submitted against GR {{gr_number}}.\n\n{{company_name}}',
    defaultBodyHtml:
      '<p>Hello {{supplier_name}},</p><p>A goods return <strong>{{return_number}}</strong> has been submitted against GR {{gr_number}}.</p><p>{{company_name}}</p>',
  },
  {
    id: 'invoice_created',
    label: 'Invoice Created',
    group: 'sales',
    description: 'Sent to the customer when an invoice is created.',
    placeholders: ['customer_name', 'invoice_number', 'invoice_date', 'due_date', 'total_amount', 'company_name'],
    defaultSubject: 'Invoice {{invoice_number}} from {{company_name}}',
    defaultBodyText:
      'Dear {{customer_name}},\n\nInvoice {{invoice_number}} dated {{invoice_date}} has been raised.\nDue date: {{due_date}}\nAmount: {{total_amount}}\n\nThank you,\n{{company_name}}',
    defaultBodyHtml:
      '<p>Dear {{customer_name}},</p><p>Invoice <strong>{{invoice_number}}</strong> dated {{invoice_date}} has been raised.</p><p>Due date: {{due_date}}<br/>Amount: {{total_amount}}</p><p>Thank you,<br/>{{company_name}}</p>',
  },
  {
    id: 'payment_received',
    label: 'Payment Received',
    group: 'sales',
    description: 'Sent to the customer when a payment is recorded.',
    placeholders: ['customer_name', 'invoice_number', 'receipt_number', 'amount_paid', 'balance_due', 'payment_type', 'company_name'],
    defaultSubject: 'Payment received for invoice {{invoice_number}}',
    defaultBodyText:
      'Dear {{customer_name}},\n\nWe received {{payment_type}} payment of {{amount_paid}} against invoice {{invoice_number}}.\nReceipt: {{receipt_number}}\nBalance due: {{balance_due}}\n\nThank you,\n{{company_name}}',
    defaultBodyHtml:
      '<p>Dear {{customer_name}},</p><p>We received {{payment_type}} payment of {{amount_paid}} against invoice {{invoice_number}}.</p><p>Receipt: {{receipt_number}}<br/>Balance due: {{balance_due}}</p><p>Thank you,<br/>{{company_name}}</p>',
  },
  {
    id: 'sales_order_customer',
    label: 'Sales Order',
    group: 'sales',
    description: 'Sent to the customer when a sales order is confirmed.',
    placeholders: ['customer_name', 'so_number', 'order_date', 'expected_date', 'total_amount', 'shop_name', 'company_name'],
    defaultSubject: 'Sales Order {{so_number}} — {{company_name}}',
    defaultBodyText:
      'Dear {{customer_name}},\n\nPlease find sales order {{so_number}} dated {{order_date}}.\nExpected date: {{expected_date}}\nPlant: {{shop_name}}\nTotal: {{total_amount}}\n\nThank you,\n{{company_name}}',
    defaultBodyHtml:
      '<p>Dear {{customer_name}},</p><p>Please find sales order <strong>{{so_number}}</strong> dated {{order_date}}.</p><p>Expected date: {{expected_date}}<br/>Plant: {{shop_name}}<br/>Total: {{total_amount}}</p><p>Thank you,<br/>{{company_name}}</p>',
  },
  {
    id: 'supplier_bill_issued',
    label: 'Supplier Bill',
    group: 'procurement',
    description: 'Sent to the supplier when a supplier bill is issued.',
    placeholders: ['supplier_name', 'bill_number', 'bill_date', 'due_date', 'total_amount', 'po_number', 'company_name'],
    defaultSubject: 'Supplier Bill {{bill_number}} — {{company_name}}',
    defaultBodyText:
      'Hello {{supplier_name}},\n\nSupplier bill {{bill_number}} dated {{bill_date}} has been issued.\nDue date: {{due_date}}\nPurchase order: {{po_number}}\nAmount: {{total_amount}}\n\n{{company_name}}',
    defaultBodyHtml:
      '<p>Hello {{supplier_name}},</p><p>Supplier bill <strong>{{bill_number}}</strong> dated {{bill_date}} has been issued.</p><p>Due date: {{due_date}}<br/>Purchase order: {{po_number}}<br/>Amount: {{total_amount}}</p><p>{{company_name}}</p>',
  },
  {
    id: 'supplier_payment_recorded',
    label: 'Supplier Payment',
    group: 'procurement',
    description: 'Sent to the supplier when a payment is recorded against a bill.',
    placeholders: ['supplier_name', 'bill_number', 'payment_number', 'amount_paid', 'balance_due', 'payment_type', 'company_name'],
    defaultSubject: 'Payment recorded for bill {{bill_number}}',
    defaultBodyText:
      'Hello {{supplier_name}},\n\nWe recorded {{payment_type}} payment of {{amount_paid}} against bill {{bill_number}}.\nPayment ref: {{payment_number}}\nBalance due: {{balance_due}}\n\n{{company_name}}',
    defaultBodyHtml:
      '<p>Hello {{supplier_name}},</p><p>We recorded {{payment_type}} payment of {{amount_paid}} against bill {{bill_number}}.</p><p>Payment ref: {{payment_number}}<br/>Balance due: {{balance_due}}</p><p>{{company_name}}</p>',
  },
  {
    id: 'payment_reminder',
    label: 'Payment Reminder',
    group: 'sales',
    description: 'Automatic reminder before invoice due date.',
    placeholders: ['customer_name', 'invoice_number', 'due_date', 'days_until_due', 'balance_due', 'company_name'],
    defaultSubject: 'Reminder: Invoice {{invoice_number}} due on {{due_date}}',
    defaultBodyText:
      'Dear {{customer_name}},\n\nThis is a reminder that invoice {{invoice_number}} is due in {{days_until_due}} day(s) on {{due_date}}.\nBalance due: {{balance_due}}\n\nThank you,\n{{company_name}}',
    defaultBodyHtml:
      '<p>Dear {{customer_name}},</p><p>This is a reminder that invoice <strong>{{invoice_number}}</strong> is due in {{days_until_due}} day(s) on {{due_date}}.</p><p>Balance due: {{balance_due}}</p><p>Thank you,<br/>{{company_name}}</p>',
  },
  {
    id: 'user_invite',
    label: 'User Invitation',
    group: 'system',
    description: 'Sent when an admin invites a user to the organization.',
    placeholders: ['invitee_name', 'invitee_email', 'inviter_name', 'role_name', 'shop_name', 'invite_url', 'company_name'],
    defaultSubject: 'You are invited to {{company_name}} on SoftdigitIMS',
    defaultBodyText:
      'Hello {{invitee_name}},\n\n{{inviter_name}} invited you to join {{company_name}} on SoftdigitIMS.\nRole: {{role_name}}\nAccept: {{invite_url}}\n\nSoftdigit Consulting',
    defaultBodyHtml:
      '<p>Hello {{invitee_name}},</p><p>{{inviter_name}} invited you to join <strong>{{company_name}}</strong> on SoftdigitIMS.</p><p>Role: {{role_name}}<br/><a href="{{invite_url}}">Accept invitation</a></p>',
  },
  {
    id: 'goods_receipt_posted',
    label: 'Goods Receipt Posted',
    group: 'warehouse',
    description: 'Internal alert when a goods receipt is posted.',
    placeholders: ['gr_number', 'supplier_name', 'shop_name', 'company_name'],
    defaultSubject: 'Goods receipt posted: {{gr_number}}',
    defaultBodyText:
      'Goods receipt {{gr_number}} from {{supplier_name}} has been posted for {{shop_name}}.\n\n{{company_name}}',
    defaultBodyHtml:
      '<p>Goods receipt <strong>{{gr_number}}</strong> from {{supplier_name}} has been posted for {{shop_name}}.</p>',
  },
  {
    id: 'goods_receipt_supplier',
    label: 'Goods Receipt (Supplier)',
    group: 'warehouse',
    description: 'Sent to the supplier when a goods receipt is posted.',
    placeholders: ['supplier_name', 'gr_number', 'gr_date', 'shop_name', 'total_value', 'po_number', 'company_name'],
    defaultSubject: 'Goods Receipt {{gr_number}} — {{company_name}}',
    defaultBodyText:
      'Hello {{supplier_name}},\n\nGoods receipt {{gr_number}} dated {{gr_date}} has been posted for {{shop_name}}.\nPurchase order: {{po_number}}\nTotal: {{total_value}}\n\n{{company_name}}',
    defaultBodyHtml:
      '<p>Hello {{supplier_name}},</p><p>Goods receipt <strong>{{gr_number}}</strong> dated {{gr_date}} has been posted for {{shop_name}}.</p><p>Purchase order: {{po_number}}<br/>Total: {{total_value}}</p><p>{{company_name}}</p>',
  },
];

export function buildDefaultEmailNotificationsConfig(): EmailNotificationsConfig {
  const templates = {} as Record<EmailTemplateId, EmailTemplateConfig>;
  for (const def of EMAIL_TEMPLATE_DEFINITIONS) {
    templates[def.id] = {
      enabled: true,
      subject: def.defaultSubject,
      bodyText: def.defaultBodyText,
      bodyHtml: def.defaultBodyHtml,
      cc: [],
      bcc: [],
    };
  }
  return {
    version: '1.0',
    templates,
    reminders: {
      paymentReminderEnabled: true,
      paymentReminderDaysBefore: [7, 3, 1],
    },
    internalAlerts: {
      lowStock: { emailEnabled: true, recipients: ['role:inventory'] },
      rfqDeadline: { emailEnabled: true, recipients: ['role:procurement'] },
      invoiceOverdue: { emailEnabled: true, recipients: ['role:accounts'] },
      goodsReceiptPosted: { emailEnabled: true, recipients: ['role:inventory'] },
    },
  };
}

export function getTemplateDefinition(templateId: EmailTemplateId) {
  const def = EMAIL_TEMPLATE_DEFINITIONS.find((row) => row.id === templateId);
  if (!def) throw new Error(`Unknown template: ${templateId}`);
  return def;
}
