import { create } from 'zustand';

export type SidebarPinMode = 'pinned' | 'auto-hide';

const STORAGE_KEY = 'retail-ims-sidebar';

type PersistedState = {
  collapsedSections: Record<string, boolean>;
  pinMode: SidebarPinMode;
  width: number; // reserved for future resize UI
};

function readStored(): PersistedState {
  const defaults: PersistedState = { collapsedSections: {}, pinMode: 'pinned', width: 240 };
  if (typeof localStorage === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      collapsedSections: parsed.collapsedSections ?? {},
      pinMode: parsed.pinMode === 'auto-hide' ? 'auto-hide' : 'pinned',
      width: typeof parsed.width === 'number' ? parsed.width : 240,
    };
  } catch {
    return defaults;
  }
}

function persist(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private browsing */
  }
}

type SidebarState = PersistedState & {
  toggleSection: (id: string) => void;
  setCollapsed: (id: string, collapsed: boolean) => void;
  expandAll: (ids: string[]) => void;
  collapseAll: (ids: string[]) => void;
  setPinMode: (mode: SidebarPinMode) => void;
};

const initial = readStored();

export const useSidebarStore = create<SidebarState>((set, get) => ({
  ...initial,

  toggleSection: (id) => {
    const next = { ...get().collapsedSections, [id]: !get().collapsedSections[id] };
    set({ collapsedSections: next });
    persist({ collapsedSections: next, pinMode: get().pinMode, width: get().width });
  },

  setCollapsed: (id, collapsed) => {
    const next = { ...get().collapsedSections, [id]: collapsed };
    set({ collapsedSections: next });
    persist({ collapsedSections: next, pinMode: get().pinMode, width: get().width });
  },

  expandAll: (ids) => {
    const next = { ...get().collapsedSections };
    for (const id of ids) next[id] = false;
    set({ collapsedSections: next });
    persist({ collapsedSections: next, pinMode: get().pinMode, width: get().width });
  },

  collapseAll: (ids) => {
    const next = { ...get().collapsedSections };
    for (const id of ids) next[id] = true;
    set({ collapsedSections: next });
    persist({ collapsedSections: next, pinMode: get().pinMode, width: get().width });
  },

  setPinMode: (mode) => {
    set({ pinMode: mode });
    persist({ collapsedSections: get().collapsedSections, pinMode: mode, width: get().width });
  },
}));
