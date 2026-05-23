/** Shared surface classes — use with `cn()` for consistent light/dark styling. */
export const uiSurfaces = {
  pageCard: 'border-border bg-card text-card-foreground shadow-sm',
  mutedPanel: 'border-border bg-muted/40',
  tableShell: 'overflow-hidden rounded-lg border border-border bg-card',
  tableHeadRow: 'border-border bg-muted/50 hover:bg-muted/50',
  tableRow: 'border-border hover:bg-muted/40',
  inputLike:
    'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/40',
} as const;
