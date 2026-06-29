import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'retail-ims-theme';

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/** Resolve a mode to the concrete theme that should be applied to <html>. */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
}

function readStoredMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system';
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

/** Apply the resolved theme to the document root. */
function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('light', resolved === 'light');
  root.style.colorScheme = resolved;
}

type ThemeState = {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readStoredMode(),
  resolved: resolveTheme(readStoredMode()),
  setMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* private browsing */
    }
    applyTheme(mode);
    set({ mode, resolved: resolveTheme(mode) });
  },
  toggle: () => {
    // Cycle based on what's currently showing so the button always flips it.
    const next: ThemeMode = get().resolved === 'dark' ? 'light' : 'dark';
    get().setMode(next);
  },
}));

/**
 * Apply the persisted (or system) theme before React mounts to avoid a flash,
 * and keep `system` mode reactive to OS changes.
 */
export function initThemeFromStorage() {
  if (typeof document === 'undefined') return;
  const mode = readStoredMode();
  applyTheme(mode);

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (useThemeStore.getState().mode === 'system') {
        applyTheme('system');
        useThemeStore.setState({ resolved: resolveTheme('system') });
      }
    };
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
  }
}
