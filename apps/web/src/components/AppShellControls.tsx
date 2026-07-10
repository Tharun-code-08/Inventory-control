import { useEffect, useState } from 'react';
import { Compass, Maximize2, Minimize2 } from 'lucide-react';

function DateBadge() {
  const now = new Date();
  const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
  const day = now.getDate();
  const month = now.toLocaleDateString(undefined, { month: 'short' });

  return (
    <div
      className="hidden items-center gap-2 rounded-lg border border-border/90 bg-gradient-to-br from-slate-50 to-white px-2.5 py-1.5 shadow-sm sm:flex"
      title={now.toLocaleDateString(undefined, { dateStyle: 'full' })}
    >
      <div className="flex h-9 w-9 flex-col items-center justify-center rounded-md bg-primary text-white leading-none">
        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-90">{weekday}</span>
        <span className="text-sm font-bold tabular-nums">{day}</span>
      </div>
      <p className="text-xs font-semibold text-foreground">{month}</p>
    </div>
  );
}

type AppShellControlsProps = {
  onOpenSpotlight: () => void;
};

export function AppShellControls({ onOpenSpotlight }: AppShellControlsProps) {
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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-input bg-accent text-primary sm:hidden"
        aria-label="Open jump menu"
      >
        <Compass className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onOpenSpotlight}
        className="group relative hidden h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-input bg-accent pl-3 pr-2 text-sm font-medium text-foreground transition hover:border-border hover:bg-accent sm:flex"
        aria-label="Open jump menu"
      >
        <Compass className="h-4 w-4 shrink-0 text-primary transition group-hover:rotate-12" />
        <span className="hidden max-w-[120px] truncate sm:inline">Jump to…</span>
        <kbd className="ml-1 hidden rounded border border-input bg-card/90 px-1.5 py-0.5 text-[10px] font-medium text-primary lg:inline">
          {isMac ? '⌘' : 'Ctrl'}+K
        </kbd>
      </button>

      <button
        type="button"
        onClick={toggleFullscreen}
        className="rounded-xl border border-border/90 bg-card/80 p-2 text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
