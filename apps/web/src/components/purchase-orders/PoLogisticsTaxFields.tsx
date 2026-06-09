import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormSection, FormGrid } from '@/components/shared';
import { FOB_OPTIONS, SHIP_VIA_OPTIONS, SHIPPING_TERMS_OPTIONS } from '@/lib/po-form-options';

const trigger = 'h-8 text-xs';

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
};

export function PoLogisticsTaxFields({ form }: Props) {
  return (
    <FormSection
      title="Shipping (PDF)"
      hint="Optional carrier and freight terms. Delivery address on the PDF is always the selected plant address above."
    >
      <FormGrid cols={3}>
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

        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
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
      </FormGrid>
    </FormSection>
  );
}
