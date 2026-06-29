
export type AddressLike = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

/** Format customer master address (billing / ship-to) as a single delivery string. */
export function formatCustomerMasterAddress(customer?: AddressLike | null): string {
  if (!customer) return '';
  const street = customer.street?.trim() ?? '';
  const cityLine = [customer.city, customer.state, customer.postalCode, customer.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  return [street, cityLine].filter(Boolean).join('\n');
}

/**
 * Delivery → billing (master) → empty.
 * Customer master has a single address block today (no separate delivery column).
 */
export function resolveCustomerDeliveryAddress(customer?: AddressLike | null): string {
  return formatCustomerMasterAddress(customer);
}
