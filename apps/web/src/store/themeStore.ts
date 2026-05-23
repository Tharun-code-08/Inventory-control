/** Force light theme only (dark mode removed). Call before React mount. */
export function initThemeFromStorage() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark');
  root.classList.add('light');
  root.style.colorScheme = 'light';
  try {
    localStorage.setItem('retail-ims-theme', 'light');
  } catch {
    /* private browsing */
  }
}
