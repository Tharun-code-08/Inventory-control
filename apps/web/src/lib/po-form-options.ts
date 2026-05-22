/** Preset options for PO logistics fields (Create PO + PDF). */

export const REQUISITIONER_PRESETS = [
  { value: '__custom__', label: 'Type name…' },
  { value: 'auto', label: 'Current user (auto)' },
  { value: 'Procurement', label: 'Procurement' },
  { value: 'IT', label: 'IT' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Warehouse', label: 'Warehouse' },
] as const;

export const SHIP_VIA_OPTIONS = [
  { value: 'FedEx — Standard / Priority / Overnight', label: 'FedEx' },
  { value: 'UPS — Ground / 2-Day / Next Day Air', label: 'UPS' },
  { value: 'DHL — Domestic & international express', label: 'DHL' },
  { value: 'USPS — Priority Mail / First Class', label: 'USPS' },
  { value: 'Freight / LTL — Bulk shipments', label: 'Freight / LTL' },
  { value: "Vendor's carrier — Seller arranges", label: "Vendor's carrier" },
  { value: "Buyer's carrier — Buyer arranges", label: "Buyer's carrier" },
  { value: 'Hand carry / Pickup — Collected in person', label: 'Hand carry / Pickup' },
] as const;

export const FOB_OPTIONS = [
  { value: 'FOB Origin — Buyer owns from seller dock', label: 'FOB Origin' },
  { value: 'FOB Destination — Seller risk until delivery', label: 'FOB Destination' },
  { value: 'FOB Origin, Freight Prepaid', label: 'FOB Origin, Freight Prepaid' },
  { value: 'FOB Origin, Freight Collect', label: 'FOB Origin, Freight Collect' },
  { value: 'FOB Destination, Freight Prepaid', label: 'FOB Destination, Freight Prepaid' },
  { value: 'FOB Destination, Freight Collect', label: 'FOB Destination, Freight Collect' },
] as const;

export const SHIPPING_TERMS_OPTIONS = [
  { value: 'Prepaid — Seller pays freight', label: 'Prepaid' },
  { value: 'Collect — Buyer pays on delivery', label: 'Collect' },
  { value: 'Prepaid & Add — Seller pays, invoices buyer', label: 'Prepaid & Add' },
  { value: 'Third Party — Billed to third party', label: 'Third Party' },
  { value: 'No Charge — Free shipping', label: 'No Charge' },
  { value: 'CIF — Cost, Insurance & Freight', label: 'CIF' },
  { value: 'EXW — Ex Works', label: 'EXW (Ex Works)' },
  { value: 'DAP — Delivered at Place', label: 'DAP' },
] as const;
