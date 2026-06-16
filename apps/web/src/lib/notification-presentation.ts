import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileText,
  Package,
  ShieldAlert,
  Truck,
  type LucideIcon,
} from 'lucide-react';

/** Visual treatment for a notification, derived from its `type`/`priority`. */
export type NotificationVisual = {
  Icon: LucideIcon;
  /** Tailwind classes for the circular icon badge (bg + text). */
  badgeClass: string;
};

/**
 * Map a notification's `AlertType` to an icon + colour, matching the design:
 * green truck for goods received, orange check for approvals, blue doc for
 * bids/RFQs, red alert for stock warnings.
 */
export function notificationVisual(type: string, priority?: string): NotificationVisual {
  const t = (type || '').toUpperCase();

  if (t.includes('GOODS_RECEIPT') || t.includes('TRANSFER')) {
    return { Icon: Truck, badgeClass: 'bg-emerald-100 text-emerald-600' };
  }
  if (t.includes('PURCHASE_ORDER') || t.includes('APPROV')) {
    return { Icon: CheckCircle2, badgeClass: 'bg-amber-100 text-amber-600' };
  }
  if (t.includes('RFQ') || t.includes('QUOTATION') || t.includes('BID')) {
    return { Icon: FileText, badgeClass: 'bg-blue-100 text-blue-600' };
  }
  if (t.includes('CRITICAL_STOCK') || t.includes('NEGATIVE')) {
    return { Icon: AlertTriangle, badgeClass: 'bg-red-100 text-red-600' };
  }
  if (t.includes('LOW_STOCK') || t.includes('CAPACITY')) {
    return { Icon: AlertTriangle, badgeClass: 'bg-red-100 text-red-600' };
  }
  if (t.includes('INVENTORY') || t.includes('ADJUSTMENT')) {
    return { Icon: Package, badgeClass: 'bg-violet-100 text-violet-600' };
  }
  if (t.includes('LOGIN') || t.includes('PASSWORD') || t.includes('SESSION') || t.includes('BIOMETRIC')) {
    return { Icon: ShieldAlert, badgeClass: 'bg-slate-200 text-slate-600' };
  }

  // Fall back to priority colouring.
  if ((priority || '').toUpperCase() === 'URGENT') {
    return { Icon: AlertTriangle, badgeClass: 'bg-red-100 text-red-600' };
  }
  return { Icon: Bell, badgeClass: 'bg-slate-200 text-slate-600' };
}

/**
 * Human, approximate "time ago" string (e.g. "about 1 hour ago"), matching the
 * design. Keeps wording deliberately fuzzy so it reads naturally.
 */
export function timeAgo(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (Number.isNaN(seconds)) return '';
  if (seconds < 45) return 'just now';
  if (seconds < 90) return 'about a minute ago';

  const minutes = Math.round(seconds / 60);
  if (minutes < 45) return `${minutes} minutes ago`;
  if (minutes < 90) return 'about an hour ago';

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `about ${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
