import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DOCUMENT_SELECT_NONE } from '@/lib/document-display';

type DocumentReferenceSelectProps<T> = {
  items: T[];
  value: string;
  onValueChange: (value: string) => void;
  getValue: (item: T) => string;
  getLabel: (item: T) => string;
  placeholder: string;
  noneLabel?: string;
  disabled?: boolean;
};

export function DocumentReferenceSelect<T>({
  items,
  value,
  onValueChange,
  getValue,
  getLabel,
  placeholder,
  noneLabel,
  disabled,
}: DocumentReferenceSelectProps<T>) {
  const selected = items.find((item) => getValue(item) === value);
  const selectedLabel = selected ? getLabel(selected) : null;

  return (
    <Select
      value={value || DOCUMENT_SELECT_NONE}
      onValueChange={(next) => onValueChange(next === DOCUMENT_SELECT_NONE ? '' : next)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DOCUMENT_SELECT_NONE}>{noneLabel ?? placeholder}</SelectItem>
        {items.map((item) => {
          const itemValue = getValue(item);
          return (
            <SelectItem key={itemValue} value={itemValue}>
              {getLabel(item)}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
