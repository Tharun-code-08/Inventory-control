import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/shared/page-header';
import { useShops } from '@/hooks/use-shops';
import {
  useDocumentSeries,
  useUpdateDocumentSeries,
  type DocumentSeriesRow,
  type DocumentSeriesUpdateRow,
} from '@/hooks/use-document-series';
import { getApiErrorMessage } from '@/lib/api-error';

const COMPANY_SCOPE = '__company__';

type EditableRow = DocumentSeriesUpdateRow & {
  moduleLabel: string;
  preview: string;
  currentSequence: number | null;
  isOverride: boolean;
  shopScoped: boolean;
  /** Raw input while editing so values like "10" can be typed without snapping to 1. */
  startingNumberInput: string;
};

function toEditableRows(rows: DocumentSeriesRow[]): EditableRow[] {
  return rows.map((row) => ({
    docType: row.docType,
    moduleLabel: row.moduleLabel,
    prefix: row.prefix,
    startingNumber: row.startingNumber,
    startingNumberInput: String(row.startingNumber),
    padWidth: row.padWidth,
    restartPeriod: row.restartPeriod,
    shopScoped: row.shopScoped,
    enabled: row.enabled,
    useCategoryPrefix: row.useCategoryPrefix,
    preview: row.preview,
    currentSequence: row.currentSequence,
    isOverride: row.isOverride,
  }));
}

function parseStartingNumber(raw: string, fallback = 1): number {
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function buildPreview(row: EditableRow): string {
  const prefix = (row.prefix ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'DOC';
  const startingNumber = parseStartingNumber(row.startingNumberInput, row.startingNumber ?? 1);
  const padded = String(startingNumber).padStart(row.padWidth ?? 5, '0');
  return `${prefix}-${padded}`;
}

export function TransactionNumberSeriesSection() {
  const { data: shops = [] } = useShops();
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeShopId = searchParams.get('shopId') || COMPANY_SCOPE;
  const selectedShopId = scopeShopId === COMPANY_SCOPE ? null : scopeShopId;

  const { data: rows = [], isLoading, refetch } = useDocumentSeries(selectedShopId);
  const updateSeries = useUpdateDocumentSeries(selectedShopId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableRow[]>([]);

  const effectiveRows = useMemo(
    () => (editing ? draft : toEditableRows(rows)),
    [draft, editing, rows],
  );

  const onScopeChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'customization');
    next.set('section', 'transaction-number-series');
    if (value === COMPANY_SCOPE) next.delete('shopId');
    else next.set('shopId', value);
    setSearchParams(next, { replace: true });
    setEditing(false);
  };

  const startEdit = () => {
    setDraft(toEditableRows(rows));
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft([]);
    setEditing(false);
  };

  const save = async () => {
    try {
      const payload: DocumentSeriesUpdateRow[] = draft.map((row) => ({
        docType: row.docType,
        prefix: row.prefix,
        startingNumber: parseStartingNumber(row.startingNumberInput, row.startingNumber ?? 1),
        padWidth: row.padWidth,
        restartPeriod: row.restartPeriod,
        shopScoped: row.shopScoped,
        enabled: row.enabled,
        useCategoryPrefix: row.useCategoryPrefix,
      }));
      await updateSeries.mutateAsync(payload);
      toast.success('Transaction number series updated');
      setEditing(false);
      setDraft([]);
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update transaction number series'));
    }
  };

  const updateDraftRow = (docType: string, patch: Partial<EditableRow>) => {
    setDraft((current) =>
      current.map((row) => (row.docType === docType ? { ...row, ...patch } : row)),
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PageHeader
              title="Transaction Number Series"
              description="Customize prefixes and starting numbers for each module. Numbers use the format PREFIX-00001."
            />
            <div className="flex items-center gap-2">
              {!editing ? (
                <Button size="sm" variant="outline" onClick={startEdit} disabled={isLoading}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    <X className="mr-1 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={save} disabled={updateSeries.isPending}>
                    <Save className="mr-1 h-4 w-4" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedShopId && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Company defaults apply to all plants unless a plant override exists. Each plant keeps its
          own sequence counter.
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scope</CardTitle>
        </CardHeader>
        <CardContent className="max-w-md">
          <Label htmlFor="series-scope">Apply settings to</Label>
          <Select value={scopeShopId} onValueChange={onScopeChange}>
            <SelectTrigger id="series-scope" className="mt-2">
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={COMPANY_SCOPE}>Company default</SelectItem>
              {shops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.shopNumber} — {shop.shopName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Series</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Starting Number</TableHead>
                <TableHead>Current Seq</TableHead>
                <TableHead>Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Loading series…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                effectiveRows.map((row) => (
                  <TableRow key={row.docType}>
                    <TableCell>
                      <div className="font-medium">{row.moduleLabel}</div>
                      {selectedShopId && row.isOverride && (
                        <div className="text-xs text-muted-foreground">Plant override</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editing ? (
                        <Input
                          value={row.prefix}
                          onChange={(e) => updateDraftRow(row.docType, { prefix: e.target.value })}
                          className="h-8 w-28"
                        />
                      ) : (
                        row.prefix || '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {editing ? (
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={row.startingNumberInput}
                          onChange={(e) => {
                            const next = e.target.value.replace(/\D/g, '');
                            updateDraftRow(row.docType, { startingNumberInput: next });
                          }}
                          onBlur={(e) => {
                            const normalized = String(parseStartingNumber(e.target.value, 1));
                            updateDraftRow(row.docType, {
                              startingNumberInput: normalized,
                              startingNumber: parseStartingNumber(normalized, 1),
                            });
                          }}
                          className="h-8 w-24"
                          aria-label={`Starting number for ${row.moduleLabel}`}
                        />
                      ) : (
                        String(row.startingNumber).padStart(row.padWidth ?? 5, '0')
                      )}
                    </TableCell>
                    <TableCell>{row.currentSequence ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {editing ? buildPreview(row) : row.preview}
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && effectiveRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No series configured yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && effectiveRows.some((row) => row.docType === 'PRD') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Products</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">Use category prefix</div>
              <div className="text-sm text-muted-foreground">
                When enabled, product codes follow category prefixes like ELE001. When disabled,
                products use the configured PRD series.
              </div>
            </div>
            <Switch
              checked={draft.find((row) => row.docType === 'PRD')?.useCategoryPrefix ?? true}
              onCheckedChange={(checked) =>
                updateDraftRow('PRD', { useCategoryPrefix: checked })
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
