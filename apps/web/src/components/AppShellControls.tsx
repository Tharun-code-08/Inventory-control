import { useEffect, useState } from 'react';
import {
  Compass,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useThemeStore } from '@/store/themeStore';

function DateBadge() {
  const now = new Date();
  const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
  const day = now.getDate();
  const month = now.toLocaleDateString(undefined, { month: 'short' });

  return (
    <div
      className="hidden items-center gap-2 rounded-lg border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white px-2.5 py-1.5 shadow-sm sm:flex dark:border-slate-700 dark:from-slate-800 dark:to-slate-900"
      title={now.toLocaleDateString(undefined, { dateStyle: 'full' })}
    >
      <div className="flex h-9 w-9 flex-col items-center justify-center rounded-md bg-indigo-600 text-white leading-none">
        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-90">{weekday}</span>
        <span className="text-sm font-bold tabular-nums">{day}</span>
      </div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{month}</p>
    </div>
  );
}

type AppShellControlsProps = {
  onOpenSpotlight: () => void;
};

export function AppShellControls({ onOpenSpotlight }: AppShellControlsProps) {
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* unsupported or denied */
    }
  }

  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <DateBadge />

      <button
        type="button"
        onClick={onOpenSpotlight}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200/90 bg-indigo-50/80 text-indigo-700 sm:hidden dark:border-indigo-500/35 dark:bg-indigo-950/40 dark:text-indigo-200"
        aria-label="Open jump menu"
      >
        <Compass className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onOpenSpotlight}
        className="group relative hidden h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-indigo-200/90 bg-indigo-50/80 pl-3 pr-2 text-sm font-medium text-indigo-900 transition hover:border-indigo-300 hover:bg-indigo-100 sm:flex dark:border-indigo-500/35 dark:bg-indigo-950/40 dark:text-indigo-100 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-950/70"
        aria-label="Open jump menu"
      >
        <Compass className="h-4 w-4 shrink-0 text-indigo-600 transition group-hover:rotate-12 dark:text-indigo-300" />
        <span className="hidden max-w-[120px] truncate sm:inline">Jump to…</span>
        <kbd className="ml-1 hidden rounded border border-indigo-200/80 bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 lg:inline dark:border-indigo-500/40 dark:bg-slate-900/80 dark:text-indigo-200">
          {isMac ? '⌘' : 'Ctrl'}+K
        </kbd>
      </button>

      <div
        className="flex items-center rounded-xl border border-slate-200/90 bg-white/80 p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
        role="group"
        aria-label="Display controls"
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            'rounded-lg p-2 transition',
            mode === 'dark'
              ? 'text-amber-300 hover:bg-amber-500/15'
              : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-700',
          )}
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
