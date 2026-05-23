import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchInput({ value, onChange, placeholder, className }: SearchInputProps) {
  return (
    <Input
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(className)}
    />
  );
}
