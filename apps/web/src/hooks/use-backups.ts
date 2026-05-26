import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export type BackupArtifact = {
  id: string;
  fileName: string;
  fileSize: string;
  sha256: string;
  provider: 'MANUAL' | 'GOOGLE_DRIVE' | 'EMAIL';
  schemaVersion: number;
  createdAt: string;
};

export type BackupStatus = {
  googleDriveConfigured: boolean;
  googleDriveConnected: boolean;
  googleDriveEmail: string | null;
  latestBackupAt: string | null;
  totalBackups?: number;
  totalStorageBytes?: string;
  emailDeliveryConfigured?: boolean;
  googleDriveConfigMissing?: string[];
  schemaVersion: number;
};

export type BackupJob = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  provider: 'MANUAL' | 'GOOGLE_DRIVE' | 'EMAIL';
  errorMessage?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
};

export type DryRunReport = {
  schemaVersion: number;
  exportedAt: string | null;
  sourceCompanyCode: string | null;
  targetCompanyCode: string;
  counts: Record<string, number>;
  warnings: string[];
  canApply: boolean;
};

export const backupKeys = {
  all: ['backups'] as const,
  status: () => [...backupKeys.all, 'status'] as const,
  artifacts: () => [...backupKeys.all, 'artifacts'] as const,
  job: (id: string) => [...backupKeys.all, 'job', id] as const,
};

export function useBackupStatus(enabled = true) {
  return useQuery({
    queryKey: backupKeys.status(),
    queryFn: async () => {
      const res = await api.get('/backups/status');
      return (res.data?.data ?? res.data) as BackupStatus;
    },
    enabled,
  });
}

export function useBackupArtifacts(enabled = true) {
  return useQuery({
    queryKey: backupKeys.artifacts(),
    queryFn: async () => {
      const res = await api.get('/backups/artifacts');
      return (res.data?.data ?? res.data) as BackupArtifact[];
    },
    enabled,
  });
}

export function useCreateBackupJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: 'MANUAL' | 'GOOGLE_DRIVE' | 'EMAIL' = 'MANUAL') => {
      const res = await api.post('/backups/jobs', { provider });
      return res.data?.data ?? res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: backupKeys.all });
    },
  });
}

export function useConnectGoogleDrive() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get('/backups/google/connect');
      const payload = res.data?.data ?? res.data;
      if (payload?.url) window.location.href = payload.url as string;
      return payload;
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Could not start Google Drive connection'));
    },
  });
}

export function useDisconnectGoogleDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete('/backups/google/connect');
      return res.data?.data ?? res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: backupKeys.status() });
    },
  });
}

export function useUploadBackupFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/backups/artifacts/upload', form);
      return res.data?.data ?? res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: backupKeys.artifacts() });
    },
  });
}

export function useDryRunRestore() {
  return useMutation({
    mutationFn: async (artifactId: string) => {
      const res = await api.post('/backups/restore/dry-run', { artifactId });
      return res.data?.data ?? res.data;
    },
  });
}

export function useApplyRestore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { restoreJobId: string; confirmationToken: string }) => {
      const res = await api.post('/backups/restore/apply', payload);
      return res.data?.data ?? res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: backupKeys.all });
    },
  });
}

export function backupDownloadUrl(artifactId: string) {
  return `/backups/artifacts/${artifactId}/download`;
}

export async function fetchBackupJob(jobId: string): Promise<BackupJob> {
  const res = await api.get(`/backups/jobs/${jobId}`);
  return (res.data?.data ?? res.data) as BackupJob;
}
