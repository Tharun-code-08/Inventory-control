import { useId } from 'react';
import { cn } from '@/lib/cn';

type BrandLogoProps = {
  /** Icon size in pixels */
  size?: number;
  /** Show title + subtitle beside the mark */
  showText?: boolean;
  /** Collapsed sidebar: icon only */
  iconOnly?: boolean;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  title?: string;
  subtitle?: string;
};

/** Retail IMS mark — inventory box on brand gradient. */
export function BrandLogoMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Retail IMS"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${gradId})`} />
      <path
        fill="#fff"
        fillOpacity="0.95"
        d="M20 10 29 15v11L20 31 11 26V15L20 10zm0 3.2-6.5 3.2v8.6L20 28.4l6.5-3.4v-8.6L20 13.2z"
      />
      <path fill="#22d3ee" d="M20 13.2v15.2l6.5-3.4v-8.6L20 13.2z" />
      <path fill="#fff" fillOpacity="0.85" d="M11 15 20 18.2 29 15 20 10 11 15z" />
    </svg>
  );
}

export function BrandLogo({
  size = 40,
  showText = true,
  iconOnly = false,
  className,
  titleClassName,
  subtitleClassName,
  title = 'Retail IMS',
  subtitle = 'Softdigit Consulting',
}: BrandLogoProps) {
  if (iconOnly || !showText) {
    return <BrandLogoMark size={size} className={className} />;
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <BrandLogoMark size={size} />
      <div className="min-w-0">
        <div
          className={cn(
            'truncate text-sm font-semibold text-slate-900 dark:text-slate-100',
            titleClassName,
          )}
        >
          {title}
        </div>
        <div
          className={cn(
            'truncate text-[11px] text-slate-500 dark:text-slate-400',
            subtitleClassName,
          )}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
