import { HelpCircle, LogOut, Settings, UserCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ProfileMenuLinksProps = {
  onNavigate: (path: string) => void;
  onLogout: () => void;
  /** Sidebar uses slightly different hover colors on logout */
  variant?: 'header' | 'sidebar';
};

export function ProfileMenuLinks({
  onNavigate,
  onLogout,
  variant = 'header',
}: ProfileMenuLinksProps) {
  const itemClass =
    variant === 'sidebar'
      ? 'flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900'
      : 'flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800';

  const logoutClass = cn(
    itemClass,
    variant === 'sidebar'
      ? 'text-rose-600 hover:bg-rose-500/10 hover:text-rose-700'
      : 'text-destructive hover:bg-destructive/10',
  );

  return (
    <>
      <button type="button" onClick={() => onNavigate('/settings')} className={itemClass}>
        <UserCircle className="h-4 w-4" />
        My Profile
      </button>
      <button type="button" onClick={() => onNavigate('/help')} className={itemClass}>
        <HelpCircle className="h-4 w-4" />
        Help & Support
      </button>
      <button type="button" onClick={() => onNavigate('/settings')} className={itemClass}>
        <Settings className="h-4 w-4" />
        Settings
      </button>
      <button type="button" onClick={onLogout} className={logoutClass}>
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </>
  );
}
