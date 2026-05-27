let pageOverride: string | undefined;
const listeners = new Set<() => void>();

export function setDocumentTitlePageOverride(page?: string) {
  const next = page?.trim() || undefined;
  if (pageOverride === next) return;
  pageOverride = next;
  listeners.forEach((listener) => listener());
}

export function getDocumentTitlePageOverride() {
  return pageOverride;
}

export function subscribeDocumentTitlePageOverride(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
