import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { BRAND } from '@/lib/brand';
import { MARKETING_NAV } from '@/lib/marketing-content';
import { MarketingCtaLink } from './MarketingCtaLink';
import { cn } from '@/lib/cn';

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="shrink-0" onClick={() => setMobileOpen(false)}>
          <img
            src="/LandingPageLogo.svg"
            alt={BRAND.companyName}
            className="h-12 w-auto sm:h-14 lg:h-16"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {MARKETING_NAV.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <MarketingCtaLink
            cta={{ label: 'Start free trial', href: '/signup?plan=trial' }}
            variant="secondary"
            className="hidden lg:inline-flex"
          />
          <MarketingCtaLink cta={{ label: BRAND.loginTitle, href: '/login' }} variant="primary" />
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          'border-t border-slate-200 bg-white md:hidden',
          mobileOpen ? 'block' : 'hidden',
        )}
      >
        <nav aria-label="Mobile" className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
          {MARKETING_NAV.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <MarketingCtaLink cta={{ label: 'Start free trial', href: '/signup?plan=trial' }} variant="secondary" />
            <MarketingCtaLink cta={{ label: BRAND.loginTitle, href: '/login' }} variant="primary" />
          </div>
        </nav>
      </div>
    </header>
  );
}
