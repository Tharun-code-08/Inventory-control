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

/** SoftdigitIMS mark — SD logo on brand circle. */
export function BrandLogoMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="SoftdigitIMS"
      className={cn('shrink-0', className)}
    >
      <circle cx="20" cy="20" r="17" fill="none" stroke="#1a1a8c" strokeWidth="3.5" />
      <path d="M 32 6 A 17 17 0 0 1 36 15" fill="none" stroke="white" strokeWidth="4.5" />
      <circle cx="20" cy="20" r="11" fill="white" stroke="#1a1a8c" strokeWidth="1.8" />
      <text x="20" y="24.5" textAnchor="middle" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="12" fontWeight="600" fill="#1a1a8c">SD</text>
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
  title = 'SoftdigitIMS',
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
