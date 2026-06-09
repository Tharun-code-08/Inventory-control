import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, CornerDownLeft, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buildNavCommands, filterNavCommands, type NavCommand } from '@/lib/app-navigation';
import { useAuthStore } from '@/store/authStore';

const SECTION_ORDER = [
  'Overview',
  'Master Data',
  'Procurement',
  'Warehouse',
  'Sales & Finance',
  'Operations',
  'Actions',
  'System',
];

type CommandSpotlightProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandSpotlight({ open, onOpenChange }: CommandSpotlightProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const allCommands = useMemo(() => buildNavCommands(user), [user]);
  const filtered = useMemo(() => filterNavCommands(allCommands, query), [allCommands, query]);

  const sections = useMemo(() => {
    const set = new Set(filtered.map((c) => c.section));
    return SECTION_ORDER.filter((s) => set.has(s));
  }, [filtered]);

  const activeSectionResolved = activeSection && sections.includes(activeSection)
    ? activeSection
    : sections[0] ?? null;

  const visible = useMemo(() => {
    if (!activeSectionResolved) return filtered;
    return filtered.filter((c) => c.section === activeSectionResolved);
  }, [filtered, activeSectionResolved]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveSection(null);
      setHighlightIndex(0);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, activeSectionResolved]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function go(cmd: NavCommand) {
    onOpenChange(false);
    navigate(cmd.path);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, Math.max(0, visible.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && visible[highlightIndex]) {
      e.preventDefault();
      go(visible[highlightIndex]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[10vh] sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Jump to"
    >
      <button
        type="button"
        className="motion-spotlight-backdrop absolute inset-0 bg-slate-950/50 backdrop-blur-[3px] dark:bg-black/65"
        aria-label="Close jump menu"
        onClick={() => onOpenChange(false)}
      />

      <div
        className="motion-spotlight-panel relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onKeyDown={onKeyDown}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400" />

        <div className="flex items-center gap-3 border-b border-slate-200/90 px-4 py-3 dark:border-slate-700">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-md">
            <Command className="h-4 w-4" />
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a page or action…"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 sm:inline dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
            esc
          </kbd>
        </div>

        <div className="flex min-h-[280px] max-h-[min(52vh,420px)]">
          <aside className="hidden w-36 shrink-0 border-r border-slate-100 bg-slate-50/80 p-2 sm:block dark:border-slate-800 dark:bg-slate-950/50">
            {sections.map((section) => {
              const count = filtered.filter((c) => c.section === section).length;
              const active = section === activeSectionResolved;
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={cn(
                    'mb-1 flex w-full items-center justify-between rounded-xl border border-transparent px-2.5 py-2 text-left text-xs font-medium transition',
                    active
                      ? 'selection-active'
                      : 'text-slate-600 hover:bg-[#eef2ff] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-indigo-950/30 dark:hover:text-slate-100',
                  )}
                >
                  <span className="truncate">{section}</span>
                  <span className={cn('tabular-nums opacity-70', active && 'text-indigo-700 dark:text-indigo-300')}>
                    {count}
                  </span>
                </button>
              );
            })}
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto p-2">
            {visible.length === 0 ? (
              <div className="motion-fade-up flex flex-col items-center px-4 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <Search className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </div>
                {query.trim() ? (
                  <>
                    <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                      No matches for &ldquo;{query}&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Try &ldquo;products&rdquo;, &ldquo;invoice&rdquo;, or &ldquo;dashboard&rdquo;
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    Type to search pages and quick actions
                  </p>
                )}
              </div>
            ) : (
              <div key={query || 'all'} className="motion-fade-up space-y-0.5">
                {visible.map((cmd, index) => {
                  const Icon = cmd.icon;
                  const selected = index === highlightIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => go(cmd)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition duration-200',
                        selected
                          ? 'selection-active'
                          : 'hover:bg-[#eef2ff] dark:hover:bg-indigo-950/25',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                          selected
                            ? 'border-indigo-300 bg-white selection-active-icon dark:border-indigo-500/50 dark:bg-slate-900'
                            : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {cmd.label}
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {cmd.hint}
                        </span>
                      </span>
                      {selected ? (
                        <span className="hidden items-center gap-1 text-[10px] text-indigo-600 sm:flex dark:text-indigo-300">
                          open <CornerDownLeft className="h-3 w-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/90 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
          <span className="sm:hidden">{sections.length} modules</span>
          <span className="hidden sm:inline">↑↓ navigate · enter open · esc close</span>
          <span>{filtered.length} destinations</span>
        </div>
      </div>
    </div>
  );
}
