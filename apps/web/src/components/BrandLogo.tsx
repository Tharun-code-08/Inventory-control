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

/** SoftdigitIMS mark — SD monogram from favicon.svg. */
export function BrandLogoMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/favicon.svg"
      alt="SoftdigitIMS"
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}

export function BrandLogo({
  size = 40,
  showText = true,
  iconOnly = false,
  className,
}: BrandLogoProps) {
  if (iconOnly || !showText) {
    return <BrandLogoMark size={size} className={className} />;
  }

  return (
    <img
      src="/IMSlogo.svg"
      alt="SoftdigitIMS"
      style={{ height: size }}
      className={cn('w-auto object-contain', className)}
    />
  );
}
