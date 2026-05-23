import { useMemo } from 'react';
import { toast } from 'sonner';
import { useCompanies } from '@/hooks/use-companies';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';

type OrganisationIdBadgeProps = {
  className?: string;
};

/** Short display code for the tenant (company code, or compact UUID fallback). */
function formatOrganisationDisplayCode(companyCode?: string | null, companyId?: string | null) {
  const code = companyCode?.trim();
  if (code) return code.toUpperCase().replace(/\s+/g, '');
  if (companyId) {
    return companyId.replace(/-/g, '').slice(0, 5).toUpperCase();
  }
  return null;
}

export function OrganisationIdBadge({ className }: OrganisationIdBadgeProps) {
  const companyId = useAuthStore((s) => s.user?.companyId);
  const { data: companies = [] } = useCompanies();

  const { displayCode, fullUuid } = useMemo(() => {
    const company = companies[0];
    const uuid = company?.id ?? companyId ?? null;
    return {
      displayCode: formatOrganisationDisplayCode(company?.companyCode, uuid),
      fullUuid: uuid,
    };
  }, [companies, companyId]);

  if (!displayCode) return null;

  async function copyId() {
    if (!fullUuid) return;
    try {
      await navigator.clipboard.writeText(fullUuid);
      toast.success('Organisation ID copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <button
      type="button"
      onClick={copyId}
      title={fullUuid ? `Organisation UUID: ${fullUuid} (click to copy)` : displayCode}
      className={cn(
        'group flex flex-col items-center rounded-md outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2',
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800/90 dark:text-emerald-300/90">
        Organisation ID
      </span>
      <span
        className="mt-0.5 min-w-[4.5rem] rounded px-3 py-0.5 font-mono text-base font-bold leading-tight tracking-[0.12em] text-white shadow-sm sm:text-lg"
        style={{ backgroundColor: '#16a34a' }}
      >
        {displayCode}
      </span>
    </button>
  );
}
