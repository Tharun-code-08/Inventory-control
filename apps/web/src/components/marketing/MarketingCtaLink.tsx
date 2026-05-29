import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import type { MarketingCta } from '@/lib/marketing-content';

type MarketingCtaLinkProps = {
  cta: MarketingCta;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
};

export function MarketingCtaLink({ cta, variant = 'primary', className }: MarketingCtaLinkProps) {
  const isInternal = cta.href.startsWith('/') && !cta.href.startsWith('//');
  const base = cn(
    'motion-marketing-cta inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
    variant === 'primary' && 'bg-slate-900 text-white hover:bg-slate-800',
    variant === 'secondary' && 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    variant === 'ghost' && 'text-indigo-600 hover:text-indigo-700 hover:underline',
    className,
  );

  if (isInternal) {
    return (
      <Link to={cta.href} className={base}>
        {cta.label}
      </Link>
    );
  }

  return (
    <a href={cta.href} className={base}>
      {cta.label}
    </a>
  );
}
