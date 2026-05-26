import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Cloud, DatabaseBackup, Download, Loader2, Upload } from 'lucide-react';
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

  useEffect(() => {
    if (searchParams.get('drive') !== 'connected') return;
    toast.success('Google Drive connected');
    const next = new URLSearchParams(searchParams);
    next.delete('drive');
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

  async function handleCreateBackup(provider: 'MANUAL' | 'GOOGLE_DRIVE') {
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
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DatabaseBackup className="h-4 w-4" />
            Backup & Restore
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Create company backups, store them on Google Drive or download manually, and restore all
            ERP data if your database is lost.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleCreateBackup('MANUAL')} disabled={createBackup.isPending}>
              {createBackup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create backup now
            </Button>
            {status?.googleDriveConnected ? (
              <Button variant="outline" onClick={() => handleCreateBackup('GOOGLE_DRIVE')}>
                Backup to Google Drive
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="h-4 w-4" />
            Google Drive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!status?.googleDriveConfigured ? (
            <div className="space-y-2 text-muted-foreground">
              <p>
                Google Drive is not enabled on the server yet. Manual upload and download still work.
              </p>
              <p className="text-xs">
                Server admin: set <code>GOOGLE_OAUTH_CLIENT_ID</code>,{' '}
                <code>GOOGLE_OAUTH_CLIENT_SECRET</code>, and{' '}
                <code>GOOGLE_OAUTH_REDIRECT_URI</code> (must end with{' '}
                <code>/api/v1/backups/google/callback</code>) in the API environment, then restart
                the API.
              </p>
            </div>
          ) : status.googleDriveConnected ? (
            <>
              <p>
                Connected as <strong>{status.googleDriveEmail ?? 'Google account'}</strong>
              </p>
              <Button variant="outline" onClick={() => disconnectDrive.mutate()} disabled={disconnectDrive.isPending}>
                Disconnect Google Drive
              </Button>
            </>
          ) : (
            <Button onClick={() => connectDrive.mutate()} disabled={connectDrive.isPending}>
              Connect Google Drive
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual backup file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="backup-upload">Upload backup (.json or .json.gz)</Label>
            <Input
              id="backup-upload"
              type="file"
              accept=".json,.gz,application/json,application/gzip"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {artifacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No backups yet.</p>
          ) : (
            artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{artifact.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(artifact.createdAt).toLocaleString()} · {artifact.provider} ·{' '}
                    {Math.round(Number(artifact.fileSize) / 1024)} KB
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedArtifactId === artifact.id ? 'default' : 'outline'}
                    onClick={() => setSelectedArtifactId(artifact.id)}
                  >
                    Select for restore
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restore company data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Restore replaces current company ERP data with the selected backup. Run dry-run first.
          </p>
          {selectedArtifact ? (
            <p>
              Selected backup: <strong>{selectedArtifact.fileName}</strong>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleDryRun} disabled={dryRun.isPending || !selectedArtifactId}>
              {dryRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Dry-run restore
            </Button>
          </div>
          {restoreReport ? (
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="font-medium">Dry-run report</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {Object.entries(restoreReport.counts).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
              {restoreReport.warnings.length ? (
                <ul className="mt-2 list-disc pl-5 text-amber-700">
                  {restoreReport.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 space-y-2">
                <Label htmlFor="restore-confirm">Type RESTORE to apply</Label>
                <Input id="restore-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
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
          <div className="rounded-lg border border-dashed p-3 text-muted-foreground">
            <p className="font-medium text-foreground">Full database disaster recovery</p>
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
