import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Customer } from '@/hooks/use-customers';
import { formatCustomerMasterAddress, resolveCustomerDeliveryAddress } from '@/lib/customer-address';

type Props = {
  deliveryAddress: string;
  notes: string;
  useMasterAddress: boolean;
  customer?: Customer | null;
  onDeliveryAddressChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onUseMasterAddressChange: (useMaster: boolean) => void;
  inputClassName?: string;
};

export function SalesOrderFulfillmentSection({
  deliveryAddress,
  notes,
  useMasterAddress,
  customer,
  onDeliveryAddressChange,
  onNotesChange,
  onUseMasterAddressChange,
  inputClassName,
}: Props) {
  const masterPreview = formatCustomerMasterAddress(customer);
  const hasMasterAddress = masterPreview.trim().length > 0;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Fulfillment Location</h3>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="use-master-address"
            type="checkbox"
            className="h-4 w-4"
            checked={useMasterAddress}
            onChange={(e) => {
              const checked = e.target.checked;
              onUseMasterAddressChange(checked);
              if (checked) {
                onDeliveryAddressChange(resolveCustomerDeliveryAddress(customer));
              }
            }}
          />
          <Label htmlFor="use-master-address" className="cursor-pointer font-normal">
            Use customer master address
          </Label>
        </div>
        {customer && !hasMasterAddress ? (
          <p className="text-xs text-amber-700">
            No address on file for this customer. Add street/city on the customer record or enter
            delivery address manually.
          </p>
        ) : customer && hasMasterAddress ? (
          <p className="whitespace-pre-line text-xs text-slate-500">{masterPreview}</p>
        ) : null}
        <Label>Customer Delivery Address</Label>
        <textarea
          className={`flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${inputClassName ?? ''}`}
          value={deliveryAddress}
          readOnly={useMasterAddress && hasMasterAddress}
          onChange={(e) => onDeliveryAddressChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input
          className={inputClassName}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
    </section>
  );
}
