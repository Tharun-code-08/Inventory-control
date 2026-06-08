import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCustomer, useCustomerSearch, type Customer } from '@/hooks/use-customers';
import { cn } from '@/lib/cn';

type Props = {
  value: string;
  onValueChange: (customerId: string, customer?: Customer) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function CustomerSearchSelect({
  value,
  onValueChange,
  placeholder = 'Search customer by name or code…',
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: selectedCustomer } = useCustomer(value, !!value);
  const { data: searchResults = [], isFetching } = useCustomerSearch(
    open ? debouncedQuery : debouncedQuery || undefined,
  );

  const options = useMemo(() => {
    const map = new Map<string, Customer>();
    if (selectedCustomer) map.set(selectedCustomer.id, selectedCustomer);
    for (const row of searchResults) map.set(row.id, row);
    return [...map.values()].sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [searchResults, selectedCustomer]);

  useEffect(() => {
    if (!value) return;
    if (selectedCustomer && !query) {
      setQuery(selectedCustomer.customerName);
    }
  }, [value, selectedCustomer, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          className="h-9 pr-8"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) {
              onValueChange('');
            }
          }}
        />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {open && !disabled ? (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {isFetching ? (
            <p className="px-3 py-2 text-sm text-slate-500">Searching…</p>
          ) : options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">No customers found</p>
          ) : (
            options.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cn(
                  'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-slate-50',
                  c.id === value && 'bg-indigo-50',
                )}
                onClick={() => {
                  onValueChange(c.id, c);
                  setQuery(c.customerName);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-slate-900">{c.customerName}</span>
                <span className="text-xs text-slate-500">{c.customerCode}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
