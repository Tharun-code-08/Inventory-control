import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, QrCode, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import BackupCodesCard from '@/components/auth/BackupCodesCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';

type MfaStatus = {
  enabled: boolean;
  method: 'totp' | null;
  enrolledAt: string | null;
};

type MfaSetupStartPayload = {
  challengeToken: string;
  email: string;
  manualCode: string;
  qrCodeDataUrl: string | null;
  otpAuthUrl: string;
  attemptsRemaining: number;
  expiresAt: string;
};

type MfaSetupVerifyPayload = {
  backupCodes: string[];
  enabled: true;
  method: 'totp';
  enrolledAt: string;
};

type BackupCodeRegenerationPayload = {
  backupCodes: string[];
  regeneratedAt: string;
};

type ManageMode = 'regenerate' | 'disable';

function formatDateTime(value: string | null) {
  if (!value) return 'Not enrolled';
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SettingsMfaCard() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [setup, setSetup] = useState<MfaSetupStartPayload | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [manageMode, setManageMode] = useState<ManageMode | null>(null);
  const [manageCode, setManageCode] = useState('');
  const [managedBackupCodes, setManagedBackupCodes] = useState<string[]>([]);

  const statusQuery = useQuery({
    queryKey: ['auth', 'mfa-status'],
    queryFn: async () => {
      const res = await api.get('/auth/mfa/status');
      return res.data.data as MfaStatus;
    },
  });

  const startEnrollment = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/mfa/settings/enroll/start');
      return res.data.data as MfaSetupStartPayload;
    },
    onSuccess: (payload) => {
      setSetup(payload);
      setCode('');
      setBackupCodes([]);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to start MFA setup.'));
    },
  });

  const verifyEnrollment = useMutation({
    mutationFn: async () => {
      if (!setup) {
        throw new Error('MFA setup is not ready yet.');
      }
      const res = await api.post('/auth/mfa/settings/enroll/verify', {
        token: setup.challengeToken,
        code,
      });
      return res.data.data as MfaSetupVerifyPayload;
    },
    onSuccess: async (payload) => {
      setBackupCodes(payload.backupCodes);
      toast.success('Authenticator app enabled successfully.');
      await queryClient.invalidateQueries({ queryKey: ['auth', 'mfa-status'] });
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to verify authenticator code.'));
    },
  });

  const regenerateBackupCodes = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/mfa/settings/backup-codes/regenerate', {
        code: manageCode,
      });
      return res.data.data as BackupCodeRegenerationPayload;
    },
    onSuccess: async (payload) => {
      setManagedBackupCodes(payload.backupCodes);
      toast.success('Backup codes regenerated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['auth', 'mfa-status'] });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to regenerate backup codes.'));
    },
  });

  const disableMfa = useMutation({
    mutationFn: async () => {
      await api.post('/auth/mfa/settings/disable', {
        code: manageCode,
      });
    },
    onSuccess: async () => {
      toast.success('MFA disabled for this account.');
      resetManageState();
      setManageDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'mfa-status'] });
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to disable MFA.'));
    },
  });

  const openSetupDialog = () => {
    setDialogOpen(true);
    setSetup(null);
    setCode('');
    setBackupCodes([]);
    startEnrollment.mutate();
  };

  const resetManageState = () => {
    setManageMode(null);
    setManageCode('');
    setManagedBackupCodes([]);
    regenerateBackupCodes.reset();
    disableMfa.reset();
  };

  const openManageDialog = (mode: ManageMode) => {
    setManageMode(mode);
    setManageDialogOpen(true);
    setManageCode('');
    setManagedBackupCodes([]);
    regenerateBackupCodes.reset();
    disableMfa.reset();
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSetup(null);
      setCode('');
      setBackupCodes([]);
      startEnrollment.reset();
      verifyEnrollment.reset();
    }
  };

  const handleManageDialogOpenChange = (open: boolean) => {
    setManageDialogOpen(open);
    if (!open) {
      resetManageState();
    }
  };

  const status = statusQuery.data;
  const statusEnabled = status?.enabled === true;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" />
                Multi-Factor Authentication
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Protect sign-in with an authenticator app and backup codes.
              </p>
            </div>
            {statusQuery.isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <Badge variant={statusEnabled ? 'success' : 'secondary'}>
                {statusEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-10 w-40" />
            </div>
          ) : statusQuery.isError ? (
            <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              Could not load MFA status right now.
            </div>
          ) : statusEnabled ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
                Your account is protected by an authenticator app.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border bg-muted px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Method</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {status?.method === 'totp' ? 'Authenticator app' : 'Configured'}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Enabled on</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatDateTime(status?.enrolledAt ?? null)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => openManageDialog('regenerate')}>
                  Regenerate backup codes
                </Button>
                <Button variant="destructive" onClick={() => openManageDialog('disable')}>
                  Disable MFA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
                MFA is currently disabled for this account.
              </div>
              <Button onClick={openSetupDialog} disabled={startEnrollment.isPending}>
                {startEnrollment.isPending ? 'Preparing setup...' : 'Set up authenticator app'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set up MFA</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the 6-digit code to enable
              MFA for this account.
            </DialogDescription>
          </DialogHeader>

          {backupCodes.length > 0 ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
                MFA is now enabled. Save these backup codes before closing this dialog.
              </div>
              <BackupCodesCard codes={backupCodes} />
              <DialogFooter>
                <Button onClick={() => handleDialogOpenChange(false)}>Close</Button>
              </DialogFooter>
            </div>
          ) : startEnrollment.isPending && !setup ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-60 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : setup ? (
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted p-4">
                  {setup.qrCodeDataUrl ? (
                    <img
                      src={setup.qrCodeDataUrl}
                      alt="Authenticator QR code"
                      className="h-56 w-56 rounded-xl border bg-card p-2"
                    />
                  ) : (
                    <div className="flex h-56 w-56 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
                      <QrCode className="mb-2 h-8 w-8" />
                      QR code is unavailable right now. Use the manual code below.
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Expires at {formatDateTime(setup.expiresAt)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Manual setup code</p>
                    <code className="mt-2 block break-all text-sm font-semibold tracking-[0.18em] text-foreground">
                      {setup.manualCode}
                    </code>
                  </div>

                  <div className="rounded-xl border bg-muted px-4 py-3 text-sm text-foreground">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p>Enter the code currently shown in your authenticator app.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {setup.attemptsRemaining} verification attempt(s) available before you
                          need to restart setup.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mfa-settings-code">Authenticator code</Label>
                    <Input
                      id="mfa-settings-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="123456"
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => startEnrollment.mutate()}
                  disabled={startEnrollment.isPending || verifyEnrollment.isPending}
                >
                  Restart setup
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogOpenChange(false)}
                    disabled={verifyEnrollment.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => verifyEnrollment.mutate()}
                    disabled={code.length !== 6 || verifyEnrollment.isPending}
                  >
                    {verifyEnrollment.isPending ? (
                      'Verifying...'
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Verify and enable
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              MFA setup could not be prepared. Try again.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={manageDialogOpen} onOpenChange={handleManageDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {manageMode === 'regenerate' ? 'Regenerate Backup Codes' : 'Disable MFA'}
            </DialogTitle>
            <DialogDescription>
              {manageMode === 'regenerate'
                ? 'Enter a current authenticator code to replace all existing backup codes.'
                : 'Enter a current authenticator code to disable MFA for this account.'}
            </DialogDescription>
          </DialogHeader>

          {manageMode === 'regenerate' && managedBackupCodes.length > 0 ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
                Your previous backup codes have been replaced. Save the new codes before closing
                this dialog.
              </div>
              <BackupCodesCard codes={managedBackupCodes} />
              <DialogFooter>
                <Button onClick={() => handleManageDialogOpenChange(false)}>Close</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-5">
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  manageMode === 'regenerate'
                    ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-900'
                    : 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'
                }`}
              >
                {manageMode === 'regenerate'
                  ? 'Any unused backup codes you have saved today will stop working immediately after regeneration.'
                  : 'After MFA is disabled, future logins will no longer ask for an authenticator code until you enable MFA again.'}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfa-manage-code">Current authenticator code</Label>
                <Input
                  id="mfa-manage-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={manageCode}
                  onChange={(event) =>
                    setManageCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleManageDialogOpenChange(false)}
                  disabled={regenerateBackupCodes.isPending || disableMfa.isPending}
                >
                  Cancel
                </Button>
                {manageMode === 'regenerate' ? (
                  <Button
                    type="button"
                    onClick={() => regenerateBackupCodes.mutate()}
                    disabled={manageCode.length !== 6 || regenerateBackupCodes.isPending}
                  >
                    {regenerateBackupCodes.isPending ? 'Regenerating...' : 'Regenerate codes'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => disableMfa.mutate()}
                    disabled={manageCode.length !== 6 || disableMfa.isPending}
                  >
                    {disableMfa.isPending ? 'Disabling...' : 'Disable MFA'}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SettingsMfaCard;
