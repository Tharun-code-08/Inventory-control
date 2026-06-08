import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';

export type DuplicateRecordDetails = {
  recordId: string;
  recordCode?: string;
  recordName?: string;
  entity: string;
  listPath?: string;
  isArchived?: boolean;
};

export function getDuplicateRecordDetails(err: unknown): DuplicateRecordDetails | null {
  const response = (err as { response?: { data?: unknown } })?.response;
  const data = response?.data;
  if (!data || typeof data !== 'object') return null;

  const nested = (data as { error?: unknown }).error;
  if (!nested || typeof nested !== 'object') return null;

  const errorObj = nested as { code?: string; details?: unknown };
  if (errorObj.code !== 'DUPLICATE_RECORD') return null;
  if (!errorObj.details || typeof errorObj.details !== 'object') return null;

  const details = errorObj.details as Record<string, unknown>;
  const recordId = typeof details.recordId === 'string' ? details.recordId : '';
  if (!recordId) return null;

  return {
    recordId,
    recordCode: typeof details.recordCode === 'string' ? details.recordCode : undefined,
    recordName: typeof details.recordName === 'string' ? details.recordName : undefined,
    entity: typeof details.entity === 'string' ? details.entity : 'Record',
    listPath: typeof details.listPath === 'string' ? details.listPath : undefined,
    isArchived: details.isArchived === true,
  };
}

type DuplicateToastOptions = {
  navigate?: (path: string, state?: unknown) => void;
  onRestore?: (details: DuplicateRecordDetails) => void | Promise<void>;
  fallback?: string;
};

export function toastDuplicateRecordError(err: unknown, options: DuplicateToastOptions = {}) {
  const details = getDuplicateRecordDetails(err);
  if (!details) {
    toast.error(getApiErrorMessage(err, options.fallback ?? 'Record already exists'));
    return;
  }

  const label = details.recordName
    ? `${details.entity} "${details.recordName}"${details.recordCode ? ` (${details.recordCode})` : ''}`
    : details.entity;

  const description = details.isArchived
    ? `${label} exists but is inactive.`
    : `${label} already exists.`;

  const openExisting =
    details.listPath && options.navigate
      ? {
          label: `Open existing ${details.entity.toLowerCase()}`,
          onClick: () => {
            options.navigate?.(details.listPath!, {
              duplicateRecordId: details.recordId,
              duplicateRecordCode: details.recordCode,
            });
          },
        }
      : null;

  const restoreExisting =
    details.isArchived && options.onRestore
      ? {
          label: 'Restore existing',
          onClick: () => {
            void options.onRestore?.(details);
          },
        }
      : null;

  const primary = restoreExisting ?? openExisting;
  if (!primary) {
    toast.error(description);
    return;
  }

  toast.error(description, {
    action: primary,
    ...(openExisting && restoreExisting
      ? {
          cancel: {
            label: openExisting.label,
            onClick: openExisting.onClick,
          },
        }
      : {}),
  });
}
