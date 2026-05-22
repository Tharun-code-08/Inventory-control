import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FOB_OPTIONS,
  REQUISITIONER_PRESETS,
  SHIP_VIA_OPTIONS,
  SHIPPING_TERMS_OPTIONS,
} from '@/lib/po-form-options';

const trigger = 'h-8 text-xs';

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  plantLabel?: string;
};

export function PoLogisticsTaxFields({ form, plantLabel }: Props) {
  const taxPercent = form.watch('taxPercent');

  function onTaxPercentChange(raw: string) {
    const pct = Number(raw) || 0;
    form.setValue('taxPercent', raw);
    if (pct > 0) {
      const half = String(pct / 2);
      if (!form.getValues('cgstPercent')) form.setValue('cgstPercent', half);
      if (!form.getValues('sgstPercent')) form.setValue('sgstPercent', half);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200/90 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      <div>
        <p className="text-sm font-semibold text-slate-900">Shipping & tax (PDF)</p>
        <p className="text-xs text-slate-500">
          Ship to on the PDF uses the delivery plant
          {plantLabel ? `: ${plantLabel}` : ''}. Tax amounts are calculated from % on subtotal.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Requisitioner</Label>
          <div className="flex gap-2">
            <Controller
              control={form.control}
              name="requisitionerPreset"
              render={({ field }) => (
                <Select value={field.value || '__custom__'} onValueChange={field.onChange}>
                  <SelectTrigger className={`${trigger} w-[140px] shrink-0`}>
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUISITIONER_PRESETS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input
              className={`${trigger} flex-1`}
              placeholder="Name or department"
              {...form.register('requisitioner')}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Ship via</Label>
          <Controller
            control={form.control}
            name="shipVia"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger className={trigger}>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {SHIP_VIA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">F.O.B.</Label>
          <Controller
            control={form.control}
            name="fob"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger className={trigger}>
                  <SelectValue placeholder="FOB terms" />
                </SelectTrigger>
                <SelectContent>
                  {FOB_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
          <Label className="text-xs">Shipping terms</Label>
          <Controller
            control={form.control}
            name="shippingTerms"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger className={trigger}>
                  <SelectValue placeholder="Shipping terms" />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_TERMS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Tax % (total GST)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            className={trigger}
            placeholder="e.g. 18"
            value={taxPercent ?? ''}
            onChange={(e) => onTaxPercentChange(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CGST %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            className={trigger}
            placeholder="e.g. 9"
            {...form.register('cgstPercent')}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">SGST %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            className={trigger}
            placeholder="e.g. 9"
            {...form.register('sgstPercent')}
          />
        </div>
      </div>
    </div>
  );
}
