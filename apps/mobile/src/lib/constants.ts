export const PAGE_SIZE = 25;

export const QUERY_STALE_TIME = {
  dashboard: 5 * 60_000,
  products: 60_000,
  alerts: 20_000,
  lists: 30_000,
} as const;

export const PDF = {
  POLL_INTERVAL: 2_000,
  MAX_WAIT: 60_000,
} as const;

export const SEARCH = {
  DEBOUNCE_MS: 500,
  MIN_LENGTH: 2,
} as const;

export const CACHE = {
  GC_TIME: 24 * 60 * 60_000,
} as const;
