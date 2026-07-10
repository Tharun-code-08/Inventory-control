import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import { api } from '@/api/client';

type LinkToken = {
  token: string;
  expiresAt: string;
  instructions: string;
};

type LinkedDevice = {
  id: string;
  phoneNumber: string;
  nickname: string | null;
  deviceType: string | null;
  status: 'ACTIVE' | 'REVOKED';
  linkedAt: string;
  lastSeenAt: string | null;
};

function maskPhone(phone: string) {
  if (phone.length <= 4) return phone;
  return `+${'X'.repeat(phone.length - 4)}${phone.slice(-4)}`;
}

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

function useCountdown(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const remainingMs = new Date(expiresAt).getTime() - now;
  if (remainingMs <= 0) return { expired: true as const, label: '00:00' };
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return { expired: false as const, label: `${minutes}:${seconds}` };
}

export function SettingsWhatsAppTab() {
  const queryClient = useQueryClient();
  const [linkToken, setLinkToken] = useState<LinkToken | null>(null);
  const [copied, setCopied] = useState(false);

  const devicesQuery = useQuery({
    queryKey: ['whatsapp', 'devices'],
    queryFn: async () => {
      const res = await api.get('/agent-platform/whatsapp/link/devices');
      return (res.data?.data ?? res.data) as LinkedDevice[];
    },
    // While a code is outstanding, poll so the table reflects the link the
    // moment the user texts LINK from their phone.
    refetchInterval: linkToken ? 5000 : false,
  });

  const generate = useMutation({
    mutationFn: async () => {
      const res = await api.post('/agent-platform/whatsapp/link/generate');
      return (res.data?.data ?? res.data) as LinkToken;
    },
    onSuccess: (data) => {
      setLinkToken(data);
      setCopied(false);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to generate link code')),
  });

  const revoke = useMutation({
    mutationFn: async (deviceId: string) => {
      await api.delete(`/agent-platform/whatsapp/link/devices/${deviceId}`);
    },
    onSuccess: () => {
      toast.success('Device removed. Its next message will be rejected.');
      void queryClient.invalidateQueries({ queryKey: ['whatsapp', 'devices'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to remove device')),
  });

  const countdown = useCountdown(linkToken?.expiresAt ?? null);
  const devices = devicesQuery.data ?? [];
  const activeDevices = useMemo(() => devices.filter((d) => d.status === 'ACTIVE'), [devices]);

  // Hide the code automatically once the phone gets linked.
  useEffect(() => {
    if (linkToken && activeDevices.length > 0 && devicesQuery.isFetched) {
      const newest = activeDevices[0];
      if (new Date(newest.linkedAt).getTime() > Date.now() - 60_000) {
        setLinkToken(null);
        toast.success(`WhatsApp ${maskPhone(newest.phoneNumber)} linked successfully`);
      }
    }
  }, [activeDevices, devicesQuery.isFetched, linkToken]);

  async function copyToken() {
    if (!linkToken) return;
    await navigator.clipboard.writeText(`LINK ${linkToken.token}`);
    setCopied(true);
    toast.success('Copied — paste it into WhatsApp');
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-5">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" />
            Link WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Link a WhatsApp number to securely use the AI Assistant. This only needs to be done
            once per number. No password or OTP is asked for inside WhatsApp — the code below,
            generated from your logged-in session, is the proof.
          </p>

          {!linkToken || countdown?.expired ? (
            <div className="space-y-3">
              {countdown?.expired && (
                <p className="text-sm text-amber-600">Code expired — generate a new one.</p>
              )}
              <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
                {generate.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Generate Link Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Your Link Code
                  </p>
                  <p className="font-mono text-2xl font-semibold tracking-widest">
                    {linkToken.token}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Expires in
                  </p>
                  <p className="font-mono text-2xl font-semibold tabular-nums">
                    {countdown?.label}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyToken}>
                  {copied ? (
                    <Check className="mr-2 h-3.5 w-3.5" />
                  ) : (
                    <Copy className="mr-2 h-3.5 w-3.5" />
                  )}
                  Copy Code
                </Button>
                <span className="text-xs text-muted-foreground">
                  Open WhatsApp and send{' '}
                  <code className="rounded bg-slate-200 px-1 py-0.5 font-mono">
                    LINK {linkToken.token}
                  </code>{' '}
                  to the business number.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" />
            Linked WhatsApp Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {devicesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading devices…
            </div>
          ) : activeDevices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No WhatsApp devices linked yet. Generate a link code above to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div className="font-medium">
                        {device.nickname ?? maskPhone(device.phoneNumber)}
                      </div>
                      {device.nickname && (
                        <div className="text-xs text-muted-foreground">
                          {maskPhone(device.phoneNumber)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(device.linkedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(device.lastSeenAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={revoke.isPending}
                        onClick={() => {
                          if (window.confirm('Remove this device? Its next message will be rejected.')) {
                            revoke.mutate(device.id);
                          }
                        }}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
