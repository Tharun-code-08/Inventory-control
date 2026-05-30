import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type SavedFilter = {
  id: string;
  name: string;
  filterJson: Record<string, unknown>;
};

type ReportsSavedFiltersBarProps = {
  filters: SavedFilter[];
  selectedId?: string;
  onSelect: (filter: SavedFilter | null) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
};

const NONE = '__none__';

export function ReportsSavedFiltersBar({
  filters,
  selectedId,
  onSelect,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: ReportsSavedFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={selectedId ?? NONE}
        onValueChange={(value) => {
          if (value === NONE) {
            onSelect(null);
            return;
          }
          const match = filters.find((f) => f.id === value) ?? null;
          onSelect(match);
        }}
      >
        <SelectTrigger className="h-9 w-[220px]">
          <SelectValue placeholder="Saved filters" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Saved filters</SelectItem>
          {filters.map((filter) => (
            <SelectItem key={filter.id} value={filter.id}>
              {filter.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving}>
        Save Filter
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => selectedId && onDelete(selectedId)}
        disabled={!selectedId || isDeleting}
      >
        Delete
      </Button>
    </div>
  );
}
