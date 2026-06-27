import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { trackCtaClick } from '@/lib/analytics';
import { resolveAuthHref } from '@/lib/marketing-links';
import type { MarketingCta } from '@/lib/marketing-content';

type MarketingCtaLinkProps = {
  cta: MarketingCta;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  /** Analytics context for the conversion event, e.g. 'hero', 'header', 'final_cta'. */
  location?: string;
};

export function MarketingCtaLink({ cta, variant = 'primary', className, location }: MarketingCtaLinkProps) {
  // On the marketing-only apex, /login & /signup live on the app subdomain.
  const href = resolveAuthHref(cta.href);
  const isInternal = href.startsWith('/') && !href.startsWith('//');
  const handleClick = () => {
    if (location) trackCtaClick(cta.href, location, cta.label);
  };
  const base = cn(
    'motion-marketing-cta inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    variant === 'primary' && 'bg-slate-900 text-white hover:bg-slate-800',
    variant === 'secondary' && 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    variant === 'ghost' && 'text-primary hover:text-primary hover:underline',
    className,
  );

  if (isInternal) {
    return (
      <Link to={href} className={base} onClick={handleClick}>
        {cta.label}
      </Link>
    );
  }

  return (
    <a href={href} className={base} onClick={handleClick}>
      {cta.label}
    </a>
  );
}
