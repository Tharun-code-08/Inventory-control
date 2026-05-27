import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/page-header';
import { useShops } from '@/hooks/use-shops';
import {
  useEmailNotifications,
  usePreviewEmailTemplate,
  useUpdateEmailNotifications,
  type EmailNotificationsConfig,
  type EmailTemplateDefinition,
} from '@/hooks/use-email-notifications';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { SenderEmailPreferencesPanel } from '@/components/settings/SenderEmailPreferencesPanel';

const COMPANY_SCOPE = '__company__';

type SidebarView =
  | { kind: 'sender' }
  | { kind: 'reminders' }
  | { kind: 'template'; id: string }
  | { kind: 'internal'; key: keyof EmailNotificationsConfig['internalAlerts'] };

const GROUP_ORDER = ['procurement', 'sales', 'warehouse', 'system'] as const;
const GROUP_LABELS: Record<(typeof GROUP_ORDER)[number], string> = {
  procurement: 'Procurement',
  sales: 'Sales',
  warehouse: 'Warehouse',
  system: 'System',
};

const INTERNAL_ALERT_META: Record<
  keyof EmailNotificationsConfig['internalAlerts'],
  { label: string; description: string; defaultRecipients: string }
> = {
  lowStock: {
    label: 'Low Stock',
    description: 'Email inventory managers when stock falls below minimum level.',
    defaultRecipients: 'role:inventory',
  },
  rfqDeadline: {
    label: 'RFQ Deadline',
    description: 'Email procurement when an RFQ response deadline is within 24 hours.',
    defaultRecipients: 'role:procurement',
  },
  invoiceOverdue: {
    label: 'Invoice Overdue',
    description: 'Email accounts when a customer invoice is past due with open balance.',
    defaultRecipients: 'role:accounts',
  },
  goodsReceiptPosted: {
    label: 'Goods Receipt Posted',
    description: 'Email inventory when a goods receipt is posted.',
    defaultRecipients: 'role:inventory',
  },
};

function parseEmailList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatEmailList(values?: string[]): string {
  return (values ?? []).join(', ');
}

function parseDays(value: string): number[] {
  return [...new Set(value.split(',').map((part) => Number(part.trim())).filter((n) => Number.isFinite(n) && n >= 0))];
}

function formatDays(values?: number[]): string {
  return (values ?? []).join(', ');
}

function resolveView(searchParams: URLSearchParams, definitions: EmailTemplateDefinition[]): SidebarView {
  const template = searchParams.get('template');
  if (template && definitions.some((def) => def.id === template)) {
    return { kind: 'template', id: template };
  }
  const alert = searchParams.get('alert');
  if (alert && alert in INTERNAL_ALERT_META) {
    return { kind: 'internal', key: alert as keyof EmailNotificationsConfig['internalAlerts'] };
  }
  const panel = searchParams.get('panel');
  if (panel === 'reminders') return { kind: 'reminders' };
  return { kind: 'sender' };
}

export function EmailNotificationsSection() {
  const { data: shops = [] } = useShops();
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeShopId = searchParams.get('shopId') || COMPANY_SCOPE;
  const selectedShopId = scopeShopId === COMPANY_SCOPE ? undefined : scopeShopId;

  const { data, isLoading, refetch } = useEmailNotifications(selectedShopId);
  const updateConfig = useUpdateEmailNotifications(selectedShopId);
  const previewTemplate = usePreviewEmailTemplate();

  const [draft, setDraft] = useState<EmailNotificationsConfig | null>(null);
  const [preview, setPreview] = useState<{ subject: string; text: string; html: string } | null>(null);

  const definitions = data?.definitions ?? [];
  const sender = data?.sender;
  const view = useMemo(() => resolveView(searchParams, definitions), [definitions, searchParams]);

  useEffect(() => {
    if (data?.config) {
      setDraft(JSON.parse(JSON.stringify(data.config)) as EmailNotificationsConfig);
      setPreview(null);
    }
  }, [data?.config]);

  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, EmailTemplateDefinition[]>();
    for (const def of definitions) {
      if (def.group === 'internal' || def.group === 'preferences') continue;
      const bucket = groups.get(def.group) ?? [];
      bucket.push(def);
      groups.set(def.group, bucket);
    }
    return groups;
  }, [definitions]);

  const setView = (nextView: SidebarView) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'customization');
    next.set('section', 'email-notifications');
    next.delete('template');
    next.delete('alert');
    next.delete('panel');
    if (nextView.kind === 'template') next.set('template', nextView.id);
    if (nextView.kind === 'internal') next.set('alert', nextView.key);
    if (nextView.kind === 'reminders') next.set('panel', 'reminders');
    setSearchParams(next, { replace: true });
    setPreview(null);
  };

  const onScopeChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'customization');
    next.set('section', 'email-notifications');
    if (value === COMPANY_SCOPE) next.delete('shopId');
    else next.set('shopId', value);
    setSearchParams(next, { replace: true });
  };

  const save = async () => {
    if (!draft) return;
    try {
      await updateConfig.mutateAsync(draft);
      toast.success('Email notification settings saved');
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save email notification settings'));
    }
  };

  const runPreview = async (templateId: string) => {
    if (!draft) return;
    try {
      const result = await previewTemplate.mutateAsync({
        templateId,
        template: draft.templates[templateId],
      });
      setPreview(result);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to preview template'));
    }
  };

  const updateTemplate = (templateId: string, patch: Partial<EmailNotificationsConfig['templates'][string]>) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        templates: {
          ...current.templates,
          [templateId]: {
            ...current.templates[templateId],
            ...patch,
          },
        },
      };
    });
  };

  const updateInternalAlert = (
    key: keyof EmailNotificationsConfig['internalAlerts'],
    patch: Partial<EmailNotificationsConfig['internalAlerts'][typeof key]>,
  ) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        internalAlerts: {
          ...current.internalAlerts,
          [key]: {
            ...current.internalAlerts[key],
            ...patch,
          },
        },
      };
    });
  };

  const selectedDefinition =
    view.kind === 'template' ? definitions.find((def) => def.id === view.id) : undefined;

  if (isLoading || !draft || !sender) {
    return <div className="text-sm text-muted-foreground">Loading email notifications…</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Email Notifications"
        description="Configure sender preferences, editable templates, payment reminders, and internal alert emails."
      >
        <Select value={scopeShopId} onValueChange={onScopeChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={COMPANY_SCOPE}>Company defaults</SelectItem>
            {shops.map((shop) => (
              <SelectItem key={shop.id} value={shop.id}>
                {shop.shopName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={save} disabled={updateConfig.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </PageHeader>

      {draft.isOverride ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Plant override active</p>
          <p className="mt-1 text-amber-900">
            You are editing plant-specific email settings. Unset values inherit company defaults.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0 pb-4">
            <div className="px-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preferences
              </p>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted',
                  view.kind === 'sender' && 'bg-muted font-medium',
                )}
                onClick={() => setView({ kind: 'sender' })}
              >
                <Mail className="h-4 w-4" />
                Sender Email
              </button>
              <button
                type="button"
                className={cn(
                  'mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted',
                  view.kind === 'reminders' && 'bg-muted font-medium',
                )}
                onClick={() => setView({ kind: 'reminders' })}
              >
                Payment Reminders
              </button>
            </div>

            <div className="px-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Templates
              </p>
              <div className="space-y-3">
                {GROUP_ORDER.map((group) => {
                  const items = groupedTemplates.get(group) ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={group} className="space-y-1">
                      <p className="px-3 text-xs text-muted-foreground">{GROUP_LABELS[group]}</p>
                      {items.map((def) => (
                        <button
                          key={def.id}
                          type="button"
                          className={cn(
                            'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted',
                            view.kind === 'template' && view.id === def.id && 'bg-muted font-medium',
                          )}
                          onClick={() => setView({ kind: 'template', id: def.id })}
                        >
                          <span>{def.label}</span>
                          {!draft.templates[def.id]?.enabled ? (
                            <Badge variant="secondary">Off</Badge>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Internal Alerts
              </p>
              <div className="space-y-1">
                {(Object.keys(INTERNAL_ALERT_META) as Array<keyof EmailNotificationsConfig['internalAlerts']>).map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted',
                        view.kind === 'internal' && view.key === key && 'bg-muted font-medium',
                      )}
                      onClick={() => setView({ kind: 'internal', key })}
                    >
                      <span>{INTERNAL_ALERT_META[key].label}</span>
                      {!draft.internalAlerts[key].emailEnabled ? (
                        <Badge variant="secondary">Off</Badge>
                      ) : null}
                    </button>
                  ),
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {view.kind === 'sender' ? <SenderEmailPreferencesPanel /> : null}

          {view.kind === 'reminders' ? (
            <Card>
              <CardHeader>
                <CardTitle>Payment Reminders</CardTitle>
                <CardDescription>
                  Automatic reminders are sent daily to customers before invoice due dates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Enable payment reminders</p>
                    <p className="text-sm text-muted-foreground">Runs once per day when SMTP is configured.</p>
                  </div>
                  <Switch
                    checked={draft.reminders.paymentReminderEnabled}
                    onCheckedChange={(checked) =>
                      setDraft({ ...draft, reminders: { ...draft.reminders, paymentReminderEnabled: checked } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder-days">Days before due date</Label>
                  <Input
                    id="reminder-days"
                    value={formatDays(draft.reminders.paymentReminderDaysBefore)}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        reminders: {
                          ...draft.reminders,
                          paymentReminderDaysBefore: parseDays(event.target.value),
                        },
                      })
                    }
                    placeholder="7, 3, 1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list, e.g. 7, 3, 1 sends reminders 7, 3, and 1 days before due date.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {view.kind === 'template' && selectedDefinition ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{selectedDefinition.label}</CardTitle>
                    <CardDescription>{selectedDefinition.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="template-enabled">Enabled</Label>
                    <Switch
                      id="template-enabled"
                      checked={draft.templates[selectedDefinition.id]?.enabled ?? true}
                      onCheckedChange={(checked) => updateTemplate(selectedDefinition.id, { enabled: checked })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-subject">Subject</Label>
                  <Input
                    id="template-subject"
                    value={draft.templates[selectedDefinition.id]?.subject ?? ''}
                    onChange={(event) => updateTemplate(selectedDefinition.id, { subject: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-body">Body (HTML allowed)</Label>
                  <Textarea
                    id="template-body"
                    rows={10}
                    value={draft.templates[selectedDefinition.id]?.bodyHtml ?? ''}
                    onChange={(event) =>
                      updateTemplate(selectedDefinition.id, {
                        bodyHtml: event.target.value,
                        bodyText: event.target.value.replace(/<[^>]+>/g, ' '),
                      })
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="template-cc">CC</Label>
                    <Input
                      id="template-cc"
                      value={formatEmailList(draft.templates[selectedDefinition.id]?.cc)}
                      onChange={(event) =>
                        updateTemplate(selectedDefinition.id, { cc: parseEmailList(event.target.value) })
                      }
                      placeholder="ops@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-bcc">BCC</Label>
                    <Input
                      id="template-bcc"
                      value={formatEmailList(draft.templates[selectedDefinition.id]?.bcc)}
                      onChange={(event) =>
                        updateTemplate(selectedDefinition.id, { bcc: parseEmailList(event.target.value) })
                      }
                      placeholder="archive@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Placeholders</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedDefinition.placeholders.map((placeholder) => (
                      <Badge key={placeholder} variant="outline">{`{{${placeholder}}}`}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => runPreview(selectedDefinition.id)}
                    disabled={previewTemplate.isPending}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </div>

                {preview ? (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Subject</p>
                      <p className="text-sm">{preview.subject}</p>
                    </div>
                    {[
                      'purchase_order_supplier',
                      'rfq_invite',
                      'sales_quotation_customer',
                      'supplier_return_notice',
                      'invoice_created',
                      'payment_received',
                    ].includes(selectedDefinition.id) ? (
                      <p className="text-xs text-muted-foreground">
                        A PDF of this document is attached automatically when the email is sent.
                      </p>
                    ) : null}
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Email preview</p>
                      <iframe
                        title="Email HTML preview"
                        sandbox=""
                        srcDoc={preview.html}
                        className="mt-2 h-[420px] w-full rounded-md border bg-white"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Plain text</p>
                      <pre className="whitespace-pre-wrap text-sm">{preview.text}</pre>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {view.kind === 'internal' ? (
            <Card>
              <CardHeader>
                <CardTitle>{INTERNAL_ALERT_META[view.key].label}</CardTitle>
                <CardDescription>{INTERNAL_ALERT_META[view.key].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Email channel</p>
                    <p className="text-sm text-muted-foreground">Uses a simple internal alert email template.</p>
                  </div>
                  <Switch
                    checked={draft.internalAlerts[view.key].emailEnabled}
                    onCheckedChange={(checked) => updateInternalAlert(view.key, { emailEnabled: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internal-recipients">Recipients</Label>
                  <Input
                    id="internal-recipients"
                    value={formatEmailList(draft.internalAlerts[view.key].recipients)}
                    onChange={(event) =>
                      updateInternalAlert(view.key, { recipients: parseEmailList(event.target.value) })
                    }
                    placeholder={INTERNAL_ALERT_META[view.key].defaultRecipients}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated emails or role tokens such as role:inventory, role:procurement, role:accounts.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
