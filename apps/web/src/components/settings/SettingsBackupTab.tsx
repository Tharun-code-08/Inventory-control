import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Cloud,
  DatabaseBackup,
  Download,
  HardDriveDownload,
  Loader2,
  Mail,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useApplyRestore,
  useBackupArtifacts,
  useBackupStatus,
  useConnectGoogleDrive,
  useCreateBackupJob,
  useDisconnectGoogleDrive,
  useDryRunRestore,
  useUploadBackupFile,
  backupDownloadUrl,
  type DryRunReport,
} from '@/hooks/use-backups';
import { useSubscription } from '@/hooks/use-subscription';
import { backupsAllowed } from '@/lib/plans';
import { getApiErrorMessage } from '@/lib/api-error';
import { api } from '@/api/client';

function formatDate(value: string | null | undefined) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

function formatBytes(value: string | number | null | undefined) {
  const num = typeof value === 'string' ? Number(value) : value ?? 0;
  if (!num || Number.isNaN(num)) return '0 KB';
  if (num >= 1024 * 1024 * 1024) return `${(num / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (num >= 1024 * 1024) return `${(num / 1024 / 1024).toFixed(1)} MB`;
  if (num >= 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${num} B`;
}

export function SettingsBackupTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subQuery = useSubscription();
  const allowed = backupsAllowed(subQuery.data);
  const statusQuery = useBackupStatus(allowed);
  const artifactsQuery = useBackupArtifacts(allowed);
  const createBackup = useCreateBackupJob();
  const connectDrive = useConnectGoogleDrive();
  const disconnectDrive = useDisconnectGoogleDrive();
  const uploadBackup = useUploadBackupFile();
  const dryRun = useDryRunRestore();
  const applyRestore = useApplyRestore();

  const [deliveryMethod, setDeliveryMethod] = useState<'MANUAL' | 'EMAIL' | 'GOOGLE_DRIVE'>('MANUAL');
  const [selectedArtifactId, setSelectedArtifactId] = useState('');
  const [restoreReport, setRestoreReport] = useState<DryRunReport | null>(null);
  const [restoreJobId, setRestoreJobId] = useState('');
  const [confirmationToken, setConfirmationToken] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const status = statusQuery.data;
  const artifacts = artifactsQuery.data ?? [];

  const selectedArtifact = useMemo(
    () => artifacts.find((a) => a.id === selectedArtifactId) ?? null,
    [artifacts, selectedArtifactId],
  );
  const lastBackupAt = status?.latestBackupAt ?? artifacts[0]?.createdAt ?? null;
  const totalBackups = status?.totalBackups ?? artifacts.length;
  const storageUsed =
    status?.totalStorageBytes != null ? Number(status.totalStorageBytes) : undefined;
  const driveAvailable = Boolean(status?.googleDriveConfigured && status?.googleDriveConnected);
  const driveSetupNeeded = !status?.googleDriveConfigured || !status?.googleDriveConnected;
  const emailAvailable = Boolean(status?.emailDeliveryConfigured);

  useEffect(() => {
    if (searchParams.get('drive') !== 'connected') return;
    toast.success('Google Drive connected');
    const next = new URLSearchParams(searchParams);
    next.delete('drive');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('drive') !== 'error') return;
    const reason = searchParams.get('reason');
    toast.error(reason ? decodeURIComponent(reason) : 'Google Drive connection failed');
    const next = new URLSearchParams(searchParams);
    next.delete('drive');
    next.delete('reason');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  if (!allowed) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DatabaseBackup className="h-4 w-4" />
            Backups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Automated backups and restore are available on Pro and Plus plans.</p>
          <Button asChild>
            <Link to="/upgrade">Upgrade to unlock backups</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function handleCreateBackup(provider: 'MANUAL' | 'GOOGLE_DRIVE' | 'EMAIL') {
    try {
      await createBackup.mutateAsync(provider);
      toast.success('Backup started. Refresh the list in a few moments.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to start backup'));
    }
  }

  async function handleUpload(file?: File | null) {
    if (!file) return;
    try {
      await uploadBackup.mutateAsync(file);
      toast.success('Backup file uploaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to upload backup file'));
    }
  }

  async function handleDryRun() {
    if (!selectedArtifactId) {
      toast.error('Select a backup file first');
      return;
    }
    try {
      const result = await dryRun.mutateAsync(selectedArtifactId);
      setRestoreReport(result.report as DryRunReport);
      setRestoreJobId(result.restoreJobId as string);
      setConfirmationToken(result.confirmationToken as string);
      toast.success('Dry-run completed. Review the report before applying.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Dry-run failed'));
    }
  }

  async function handleApplyRestore() {
    if (confirmText.trim().toUpperCase() !== 'RESTORE') {
      toast.error('Type RESTORE to confirm');
      return;
    }
    try {
      const result = await applyRestore.mutateAsync({ restoreJobId, confirmationToken });
      toast.success(`Restore completed (${result.recordsProcessed ?? 0} records processed)`);
      setRestoreReport(null);
      setConfirmText('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Restore failed'));
    }
  }

  async function handleDownload(artifactId: string, fileName: string) {
    try {
      const res = await api.get(backupDownloadUrl(artifactId), { responseType: 'blob' });
      const blob = res.data as Blob;
      if (blob.type.includes('json') && blob.size < 4096) {
        const text = await blob.text();
        try {
          const payload = JSON.parse(text) as { error?: { message?: string }; message?: string };
          toast.error(payload.error?.message ?? payload.message ?? 'Download failed');
          return;
        } catch {
          // Not JSON — treat as file payload.
        }
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Download failed'));
    }
  }

  return (
    <div className="max-w-4xl space-y-4 rounded-2xl bg-slate-950 p-6 text-slate-100 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <DatabaseBackup className="h-4 w-4" />
            Backup & restore
          </div>
          <p className="text-sm text-slate-300">
            Protect your ERP data — export, download, and recover anytime.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">Pro</span>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
            backup & restore
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="bg-slate-900/80 border-slate-800 text-slate-100">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Last backup</p>
            <p className="text-lg font-semibold">{formatDate(lastBackupAt)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800 text-slate-100">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Total backups</p>
            <p className="text-lg font-semibold">{totalBackups}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800 text-slate-100">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Storage used</p>
            <p className="text-lg font-semibold">
              {storageUsed != null ? formatBytes(storageUsed) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/80 border-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Create a new backup</CardTitle>
            <Button
              className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
              onClick={() => handleCreateBackup(deliveryMethod)}
              disabled={
                createBackup.isPending ||
                (deliveryMethod === 'GOOGLE_DRIVE' && !driveAvailable) ||
                (deliveryMethod === 'EMAIL' && !emailAvailable)
              }
            >
              {createBackup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create backup
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              className={`flex h-full flex-col rounded-xl border p-3 text-left transition ${
                deliveryMethod === 'MANUAL'
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-900'
              }`}
              onClick={() => setDeliveryMethod('MANUAL')}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <HardDriveDownload className="h-4 w-4" />
                Direct download
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                  Free
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300">Save to your machine instantly.</p>
            </button>
            <button
              type="button"
              className={`flex h-full flex-col rounded-xl border p-3 text-left transition ${
                deliveryMethod === 'EMAIL'
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-900'
              } ${emailAvailable ? '' : 'opacity-70'}`}
              onClick={() => emailAvailable && setDeliveryMethod('EMAIL')}
              disabled={!emailAvailable}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4" />
                Email delivery
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                  Free
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Sends the backup to your admin email via SMTP.
              </p>
              {!emailAvailable ? (
                <p className="mt-1 text-[11px] text-amber-300">SMTP not configured</p>
              ) : null}
            </button>
            <button
              type="button"
              className={`flex h-full flex-col rounded-xl border p-3 text-left transition ${
                deliveryMethod === 'GOOGLE_DRIVE'
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-900'
              } ${driveAvailable ? '' : 'opacity-70'}`}
              onClick={() => driveAvailable && setDeliveryMethod('GOOGLE_DRIVE')}
              disabled={!driveAvailable}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Cloud className="h-4 w-4" />
                Google Drive
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    driveAvailable ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'
                  }`}
                >
                  {driveAvailable ? 'Free' : 'Setup needed'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300">Requires Google OAuth connect.</p>
              {driveSetupNeeded ? (
                <div className="mt-1 space-y-1 text-[11px] text-amber-300">
                  <p>Connect Google Drive to enable.</p>
                  {status?.googleDriveConfigMissing?.length ? (
                    <p>Missing: {status.googleDriveConfigMissing.join(', ')}</p>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
                    onClick={() => connectDrive.mutate()}
                    disabled={connectDrive.isPending || !status?.googleDriveConfigured}
                  >
                    {connectDrive.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Connect Google Drive
                  </Button>
                </div>
              ) : null}
              {driveAvailable ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 px-0 text-xs text-emerald-200 hover:text-emerald-100"
                  onClick={() => disconnectDrive.mutate()}
                  disabled={disconnectDrive.isPending}
                >
                  Disconnect
                </Button>
              ) : null}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/80 border-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Manual upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs text-slate-300" htmlFor="backup-upload">
            Upload a backup file (.json or .json.gz)
          </Label>
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4">
            <Input
              id="backup-upload"
              type="file"
              accept=".json,.gz,application/json,application/gzip"
              className="bg-slate-900 text-slate-100"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
            <p className="mt-2 text-[11px] text-slate-400">
              Files are validated with SHA-256 checksum before restore.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/80 border-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Backup history</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-100"
              onClick={() => artifactsQuery.refetch()}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {artifacts.length === 0 ? (
            <p className="text-sm text-slate-400">No backups yet.</p>
          ) : (
            artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold">{artifact.fileName}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(artifact.createdAt)} · {artifact.provider} ·{' '}
                      {formatBytes(Number(artifact.fileSize))}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={selectedArtifactId === artifact.id ? 'default' : 'outline'}
                    className="border-slate-700"
                    onClick={() => setSelectedArtifactId(artifact.id)}
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700"
                    onClick={() => handleDownload(artifact.id, artifact.fileName)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border border-rose-900 bg-rose-950/40 text-slate-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-300" />
            <CardTitle className="text-base">Restore company data</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-slate-200">
            Restore replaces current company ERP data with the selected backup. Always run a dry-run first.
          </p>
          {selectedArtifact ? (
            <p className="text-xs text-slate-300">
              Selected backup: <strong>{selectedArtifact.fileName}</strong>
            </p>
          ) : (
            <p className="text-xs text-amber-300">Select a backup from history to restore.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-amber-500 text-amber-100 hover:bg-amber-500/10"
              onClick={handleDryRun}
              disabled={dryRun.isPending || !selectedArtifactId}
            >
              {dryRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Dry-run restore
            </Button>
          </div>
          {restoreReport ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <p className="font-medium">Dry-run report</p>
              <ul className="mt-2 list-disc pl-5 text-slate-300">
                {Object.entries(restoreReport.counts).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
              {restoreReport.warnings.length ? (
                <ul className="mt-2 list-disc pl-5 text-amber-300">
                  {restoreReport.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 space-y-2">
                <Label htmlFor="restore-confirm">Type RESTORE to apply</Label>
                <Input
                  id="restore-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="border-slate-700 bg-slate-900 text-slate-100"
                />
                <Button
                  variant="destructive"
                  disabled={!restoreReport.canApply || applyRestore.isPending}
                  onClick={handleApplyRestore}
                >
                  Apply restore
                </Button>
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border border-dashed border-slate-800 p-3 text-xs text-slate-300">
            <p className="font-medium text-slate-100">Full database disaster recovery</p>
            <p className="mt-1">
              If the entire VPS database is lost, use the server runbook with{' '}
              <code>deploy/postgres/scripts/pg-restore-full.sh</code> and uploaded backup artifacts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
