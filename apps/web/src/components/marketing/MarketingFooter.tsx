import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { BRAND } from '@/lib/brand';
import { MARKETING_FOOTER, type MarketingFooterLink } from '@/lib/marketing-content';
import { useCookieConsentStore } from '@/store/cookieConsentStore';

function FooterLink({ link }: { link: MarketingFooterLink }) {
  const isInternal = link.href.startsWith('/') && !link.href.startsWith('//');
  const className = 'text-sm text-slate-600 transition hover:text-slate-900';

  if (isInternal) {
    return (
      <Link to={link.href} className={className}>
        {link.label}
      </Link>
    );
  }

  return (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  );
}

export function MarketingFooter() {
  const openPreferences = useCookieConsentStore((state) => state.setPreferencesOpen);
  const { tagline, navColumns, privacyUrl, termsUrl, socialLinks } = MARKETING_FOOTER;

  const companyLinks = [...(navColumns.find((c) => c.heading === 'Company')?.links ?? [])];
  if (privacyUrl) companyLinks.push({ label: 'Privacy Policy', href: privacyUrl });
  if (termsUrl) companyLinks.push({ label: 'Terms of Use', href: termsUrl });

  const columns = navColumns.map((col) =>
    col.heading === 'Company' ? { ...col, links: companyLinks } : col,
  );

  const hasSocial = Boolean(socialLinks.linkedin || socialLinks.twitter);

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:gap-8">
          <div>
            <img
              src="/LandingPageLogo.svg"
              alt={BRAND.companyName}
              className="h-12 w-auto sm:h-14 lg:h-16"
            />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">{tagline}</p>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-slate-900">{col.heading}</h3>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={`${col.heading}-${link.label}`}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {hasSocial ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Follow</h3>
              <div className="mt-4 flex gap-3">
                {socialLinks.linkedin ? (
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    aria-label="LinkedIn"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.126 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                ) : null}
                {socialLinks.twitter ? (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    aria-label="Twitter"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{BRAND.copyright(new Date().getFullYear())}</p>
          <button
            type="button"
            className="text-left font-medium text-primary hover:underline sm:text-right"
            onClick={() => openPreferences(true)}
          >
            Cookie Preferences
          </button>
        </div>
      </div>
    </footer>
  );
}
