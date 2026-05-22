import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'retail-ims-theme';

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function applyThemeClass(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode;
}

/** Call once before React mount to avoid theme flash. */
export function initThemeFromStorage() {
  applyThemeClass(readStoredTheme());
}

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readStoredTheme(),
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    applyThemeClass(mode);
    set({ mode });
  },
  toggle: () => {
    const next = get().mode === 'dark' ? 'light' : 'dark';
    get().setMode(next);
  },
}));
