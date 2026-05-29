import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isSearching?: boolean;
  showNoResults?: boolean;
  noResultsMessage?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  isSearching = false,
  showNoResults = false,
  noResultsMessage = 'No results match your search.',
}: SearchInputProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="group relative">
        <Search
          className={cn(
            'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200 group-focus-within:scale-110 group-focus-within:text-primary',
            isSearching && 'opacity-0',
          )}
          aria-hidden="true"
        />
        {isSearching ? (
          <Loader2
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
            aria-hidden="true"
          />
        ) : null}
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-9"
          aria-busy={isSearching}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {showNoResults ? (
        <p className="motion-fade-up px-1 text-xs text-muted-foreground">{noResultsMessage}</p>
      ) : null}
    </div>
  );
}
