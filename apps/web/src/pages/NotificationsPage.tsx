import { useMemo, useState } from 'react';
import { Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import {
  useNotificationConfig,
  useUpdateNotificationConfig,
  type NotificationChannel,
  type NotificationConfig,
  type NotificationSeverity,
} from '@/hooks/use-notifications';

const severityOptions: NotificationSeverity[] = ['URGENT', 'WARNING', 'ACTION', 'INFO'];
const channelOptions: NotificationChannel[] = ['Email', 'SMS', 'In-app', 'WhatsApp'];

function severityDotClass(severity: NotificationSeverity) {
  if (severity === 'URGENT') return 'bg-red-500';
  if (severity === 'WARNING') return 'bg-amber-500';
  if (severity === 'ACTION') return 'bg-emerald-500';
  return 'bg-blue-500';
}

export function NotificationsPage() {
  const configQuery = useNotificationConfig();
  const updateMutation = useUpdateNotificationConfig();
  const [draft, setDraft] = useState<NotificationConfig | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const config = useMemo(() => draft ?? configQuery.data ?? null, [draft, configQuery.data]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const updateRuleField = (
    groupIndex: number,
    ruleIndex: number,
    field: 'title' | 'notifyTo' | 'severity',
    value: string,
  ) => {
    if (!config) return;
    const next: NotificationConfig = {
      ...config,
      groups: config.groups.map((group, gIdx) =>
        gIdx !== groupIndex
          ? group
          : {
              ...group,
              rules: group.rules.map((rule, rIdx) =>
                rIdx !== ruleIndex ? rule : { ...rule, [field]: value },
              ),
            },
      ),
    };
    setDraft(next);
  };

  const toggleRuleChannel = (groupIndex: number, ruleIndex: number, channel: NotificationChannel) => {
    if (!config) return;
    const next: NotificationConfig = {
      ...config,
      groups: config.groups.map((group, gIdx) =>
        gIdx !== groupIndex
          ? group
          : {
              ...group,
              rules: group.rules.map((rule, rIdx) => {
                if (rIdx !== ruleIndex) return rule;
                const exists = rule.channels.includes(channel);
                const channels = exists
                  ? rule.channels.filter((entry) => entry !== channel)
                  : [...rule.channels, channel];
                return { ...rule, channels: channels.length ? channels : ['In-app'] };
              }),
            },
      ),
    };
    setDraft(next);
  };

  const onSave = async () => {
    if (!config) return;
    try {
      await updateMutation.mutateAsync(config);
      toast.success('Notification settings saved');
      setDraft(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
        'Failed to save notification settings';
      toast.error(msg);
    }
  };

  return (
    <AppLayout active="Notifications">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">Configure alert rules and channels by module.</p>
          </div>
          <Button onClick={onSave} disabled={!config || updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 rounded-xl border bg-card p-3 text-sm">
          {severityOptions.map((severity) => (
            <div key={severity} className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', severityDotClass(severity))} />
              <span>{severity}</span>
            </div>
          ))}
        </div>

        <Card className="p-4">
          <p className="text-sm font-semibold">Channel rollout plan</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>Email first: SMTP or SendGrid can be enabled immediately for production alerts.</li>
            <li>WhatsApp requires provider onboarding (Twilio/WATI) and Meta template approval before go-live.</li>
            <li>Use in-app as default fallback for every rule.</li>
          </ul>
        </Card>

        {configQuery.isLoading ? (
          <Card className="p-4 text-sm text-muted-foreground">Loading notification settings...</Card>
        ) : !config || config.groups.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">No notification configuration found.</Card>
        ) : (
          config.groups.map((group, gIdx) => {
            const open = openGroups[group.id] ?? true;
            return (
              <Card key={group.id} className="overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b px-4 py-3 text-left"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{group.title}</p>
                      <p className="text-xs text-muted-foreground">{group.moduleTags.join(' · ')}</p>
                    </div>
                  </div>
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {open && (
                  <div className="space-y-4 p-4">
                    {group.rules.map((rule, rIdx) => (
                      <div key={rule.id} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2.5 w-2.5 rounded-full', severityDotClass(rule.severity))} />
                          <Input
                            value={rule.title}
                            onChange={(e) => updateRuleField(gIdx, rIdx, 'title', e.target.value)}
                          />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Notifies</Label>
                            <Input
                              value={rule.notifyTo}
                              onChange={(e) => updateRuleField(gIdx, rIdx, 'notifyTo', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Severity</Label>
                            <div className="flex flex-wrap gap-2">
                              {severityOptions.map((severity) => (
                                <Button
                                  key={severity}
                                  type="button"
                                  variant={rule.severity === severity ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => updateRuleField(gIdx, rIdx, 'severity', severity)}
                                >
                                  {severity}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label>Channels</Label>
                          <div className="flex flex-wrap gap-2">
                            {channelOptions.map((channel) => (
                              <Badge
                                key={channel}
                                variant={rule.channels.includes(channel) ? 'default' : 'outline'}
                                className={cn('cursor-pointer', channel === 'WhatsApp' && 'opacity-80')}
                                onClick={() => toggleRuleChannel(gIdx, rIdx, channel)}
                              >
                                {channel}
                                {channel === 'WhatsApp' ? ' (approval needed)' : ''}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}

        <Card className="p-4">
          <p className="text-sm font-semibold">Delivery observability</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add provider webhook events to store message delivery, failure reason, and retry attempts per notification rule.
            This gives ops a single view to troubleshoot missed alerts.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
