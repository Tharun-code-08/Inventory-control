import { useState } from 'react';
import { CheckCircle2, Copy, Mail, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateEmailSender,
  useDeleteEmailSender,
  useEmailSenders,
  useFetchDomainDkim,
  useSendSenderVerification,
  useUpdateEmailSender,
  useValidateEmailDomain,
  useVerifySenderOtp,
  type EmailSenderRow,
} from '@/hooks/use-email-senders';
import { getApiErrorMessage } from '@/lib/api-error';

function statusBadge(status: EmailSenderRow['status']) {
  if (status === 'VERIFIED') return <Badge className="bg-emerald-600">Verified</Badge>;
  if (status === 'FAILED') return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

export function SenderEmailPreferencesPanel() {
  const { data, isLoading, refetch } = useEmailSenders();
  const createSender = useCreateEmailSender();
  const updateSender = useUpdateEmailSender();
  const deleteSender = useDeleteEmailSender();
  const validateDomain = useValidateEmailDomain();
  const fetchDkim = useFetchDomainDkim();
  const sendVerification = useSendSenderVerification();
  const verifyOtp = useVerifySenderOtp();

  const [newSenderOpen, setNewSenderOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  const [dnsOpen, setDnsOpen] = useState(false);
  const [dnsDomain, setDnsDomain] = useState('');
  const [dnsHost, setDnsHost] = useState('');
  const [dnsValue, setDnsValue] = useState('');

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpSender, setOtpSender] = useState<EmailSenderRow | null>(null);
  const [otpCode, setOtpCode] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editSender, setEditSender] = useState<EmailSenderRow | null>(null);
  const [editName, setEditName] = useState('');

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Loading sender preferences…</div>;
  }

  const openDnsModal = async (domain: string) => {
    try {
      const record = await fetchDkim.mutateAsync(domain);
      setDnsDomain(domain);
      setDnsHost(record.dkimHost);
      setDnsValue(record.dkimValue);
      setDnsOpen(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load DNS record'));
    }
  };

  const submitNewSender = async () => {
    try {
      await createSender.mutateAsync({ displayName: displayName.trim(), email: email.trim() });
      toast.success('Sender added');
      setNewSenderOpen(false);
      setDisplayName('');
      setEmail('');
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to add sender'));
    }
  };

  const submitEdit = async () => {
    if (!editSender) return;
    try {
      await updateSender.mutateAsync({ id: editSender.id, displayName: editName.trim() });
      toast.success('Sender updated');
      setEditOpen(false);
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update sender'));
    }
  };

  const makePrimary = async (sender: EmailSenderRow) => {
    try {
      await updateSender.mutateAsync({ id: sender.id, isPrimary: true });
      toast.success('Primary sender updated');
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to set primary sender'));
    }
  };

  const removeSender = async (sender: EmailSenderRow) => {
    try {
      await deleteSender.mutateAsync(sender.id);
      toast.success('Sender removed');
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove sender'));
    }
  };

  const validateDns = async () => {
    try {
      await validateDomain.mutateAsync(dnsDomain);
      toast.success('Domain authenticated');
      setDnsOpen(false);
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Domain validation failed'));
    }
  };

  const resendVerification = async (sender: EmailSenderRow) => {
    try {
      await sendVerification.mutateAsync(sender.id);
      toast.success('Verification email sent from office@softdigitconsulting.com');
      setOtpSender(sender);
      setOtpCode('');
      setOtpOpen(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to send verification email'));
    }
  };

  const submitOtp = async () => {
    if (!otpSender) return;
    try {
      await verifyOtp.mutateAsync({ senderId: otpSender.id, otpCode: otpCode.trim() });
      toast.success('Sender verified');
      setOtpOpen(false);
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Verification failed'));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Sender Email Preferences</CardTitle>
            <CardDescription>
              Platform emails use {data.platform.from}. Tenant business emails use your verified senders below.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setNewSenderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Sender
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium">Platform mailbox (read-only)</p>
            <p className="mt-1 text-muted-foreground">{data.platform.guidance}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">From</p>
                <p>{data.platform.from}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Reply-to</p>
                <p>{data.platform.replyTo}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">SMTP</p>
                <p>{data.platform.configured ? 'Configured' : 'Not configured'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Unauthenticated domains</p>
            {data.customDomains.length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom-domain senders yet.</p>
            ) : (
              data.customDomains.map((domain) => (
                <div key={domain.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {domain.status === 'VERIFIED' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-amber-600" />
                      )}
                      <span className="font-medium">{domain.domain}</span>
                      {statusBadge(domain.status)}
                    </div>
                    {domain.status !== 'VERIFIED' ? (
                      <Button size="sm" variant="link" onClick={() => openDnsModal(domain.domain)}>
                        Authenticate Now
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-2">
                    {domain.senders.map((sender) => (
                      <div
                        key={sender.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{sender.displayName}</span>
                          {sender.isPrimary ? <Badge>PRIMARY</Badge> : null}
                          <span className="text-muted-foreground">{sender.email}</span>
                          {statusBadge(sender.status)}
                        </div>
                        <div className="flex items-center gap-1">
                          {!sender.isPrimary ? (
                            <Button size="sm" variant="ghost" onClick={() => makePrimary(sender)}>
                              Set primary
                            </Button>
                          ) : null}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditSender(sender);
                              setEditName(sender.displayName);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeSender(sender)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Public domains</p>
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Public emails (Gmail, Outlook, etc.) are verified by OTP sent from {data.platform.from}. Business emails
              relay through the platform mailbox with Reply-To set to your verified address.
            </div>
            {data.publicSenders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No public-domain senders yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Email</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.publicSenders.map((sender) => (
                      <tr key={sender.id} className="border-t">
                        <td className="px-4 py-3">
                          {sender.displayName}
                          {sender.isPrimary ? <Badge className="ml-2">PRIMARY</Badge> : null}
                        </td>
                        <td className="px-4 py-3">{sender.email}</td>
                        <td className="px-4 py-3">
                          {sender.status === 'VERIFIED' ? (
                            statusBadge(sender.status)
                          ) : (
                            <button
                              type="button"
                              className="text-amber-700 underline-offset-2 hover:underline"
                              onClick={() => resendVerification(sender)}
                            >
                              Unverified (Resend Email)
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {!sender.isPrimary ? (
                              <Button size="sm" variant="ghost" onClick={() => makePrimary(sender)}>
                                Set primary
                              </Button>
                            ) : null}
                            <Button size="icon" variant="ghost" onClick={() => removeSender(sender)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={newSenderOpen} onOpenChange={setNewSenderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Sender</DialogTitle>
            <DialogDescription>Add a custom-domain or public-domain sender for {data.companyName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="sender-name">Display name</Label>
              <Input id="sender-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sender-email">Email address</Label>
              <Input id="sender-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSenderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNewSender} disabled={createSender.isPending}>
              Add sender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit sender</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="edit-sender-name">Display name</Label>
            <Input id="edit-sender-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={submitEdit} disabled={updateSender.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dnsOpen} onOpenChange={setDnsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authenticate {dnsDomain}</DialogTitle>
            <DialogDescription>
              Add the TXT record below at your DNS provider, then click Validate. Also add this domain in Zoho Mail if
              you want the From header to use your domain address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Host name</Label>
              <div className="flex gap-2">
                <Input value={dnsHost} readOnly />
                <Button type="button" variant="outline" size="icon" onClick={() => copyText(dnsHost, 'Host name')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Value</Label>
              <div className="flex gap-2">
                <Input value={dnsValue} readOnly />
                <Button type="button" variant="outline" size="icon" onClick={() => copyText(dnsValue, 'Value')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDnsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={validateDns} disabled={validateDomain.isPending}>
              Validate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify {otpSender?.email}</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent from {data.platform.from}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            maxLength={6}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => otpSender && resendVerification(otpSender)}>
              Resend email
            </Button>
            <Button onClick={submitOtp} disabled={verifyOtp.isPending || otpCode.length !== 6}>
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
