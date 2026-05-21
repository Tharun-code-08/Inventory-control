type BasicUser = {
  id?: string;
  email?: string;
  name?: string;
} | null | undefined;

export const ANIMAL_AVATARS = ['chick', 'owl', 'penguin', 'rabbit', 'eagle', 'cat'] as const;
export type AnimalAvatarKind = (typeof ANIMAL_AVATARS)[number];

const ANIMAL_EMOJI: Record<AnimalAvatarKind, string> = {
  chick: '🐥',
  owl: '🦉',
  penguin: '🐧',
  rabbit: '🐰',
  eagle: '🦅',
  cat: '🐱',
};

const AVATAR_BG = [
  'from-amber-500 to-orange-500',
  'from-stone-500 to-amber-700',
  'from-slate-700 to-slate-900',
  'from-pink-300 to-fuchsia-400',
  'from-zinc-700 to-zinc-900',
  'from-orange-400 to-rose-500',
] as const;

const STORAGE_KEY = 'retail-ims-animal-avatar-preferences';

function hashText(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function userKey(user: BasicUser) {
  return `${user?.id ?? ''}|${user?.email ?? ''}|${user?.name ?? ''}`;
}

function readPreferenceMap() {
  if (typeof window === 'undefined') return {} as Record<string, AnimalAvatarKind>;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as Record<string, AnimalAvatarKind>;
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, AnimalAvatarKind> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (ANIMAL_AVATARS.includes(v as AnimalAvatarKind)) {
        out[k] = v as AnimalAvatarKind;
      }
    }
    return out;
  } catch {
    return {} as Record<string, AnimalAvatarKind>;
  }
}

export function setAnimalAvatarPreference(user: BasicUser, kind: AnimalAvatarKind) {
  const key = userKey(user);
  if (!key || typeof window === 'undefined') return;
  const map = readPreferenceMap();
  map[key] = kind;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getAnimalAvatarPreference(user: BasicUser): AnimalAvatarKind | null {
  const key = userKey(user);
  if (!key) return null;
  const map = readPreferenceMap();
  return map[key] ?? null;
}

export function animalAvatarForUser(user: BasicUser) {
  const preferred = getAnimalAvatarPreference(user);
  const seed = userKey(user);
  const idx = preferred ? ANIMAL_AVATARS.indexOf(preferred) : hashText(seed || 'guest') % ANIMAL_AVATARS.length;
  const kind = ANIMAL_AVATARS[Math.max(0, idx)];
  return {
    kind,
    emoji: ANIMAL_EMOJI[kind],
    bgClass: AVATAR_BG[idx],
  };
}

export function animalAvatarByKind(kind: AnimalAvatarKind) {
  const idx = ANIMAL_AVATARS.indexOf(kind);
  return {
    kind,
    emoji: ANIMAL_EMOJI[kind],
    bgClass: AVATAR_BG[Math.max(0, idx)],
  };
}

