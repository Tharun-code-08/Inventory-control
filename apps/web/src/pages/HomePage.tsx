import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { PricingSection } from '@/components/PricingSection';
import { BRAND } from '@/lib/brand';

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#030b2a] text-slate-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600"
      >
        Skip to main content
      </a>

      <header className="border-b border-white/10 bg-[#030b2a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo
            size={40}
            title={BRAND.companyName}
            subtitle={BRAND.productName}
            titleClassName="text-slate-100"
            subtitleClassName="text-slate-400"
          />
          <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-5">
            <a
              href="#pricing"
              className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:inline-block"
            >
              Pricing
            </a>
            <a
              href="#services"
              className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:inline-block"
            >
              Services
            </a>
            <a
              href="#ims"
              className="hidden text-sm font-medium text-slate-300 transition hover:text-white md:inline-block"
            >
              {BRAND.productName}
            </a>
            <a
              href="#contact"
              className="hidden text-sm font-medium text-slate-300 transition hover:text-white lg:inline-block"
            >
              Contact
            </a>
            <Link
              to="/login"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {BRAND.loginTitle}
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section
          className="border-b border-white/10 bg-[linear-gradient(180deg,#030b2a_0%,#04123b_60%,#071b49_100%)]"
          aria-labelledby="hero-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200/85">
              {BRAND.companyName.toUpperCase()}
            </p>
            <h1 id="hero-heading" className="mt-3 max-w-4xl text-4xl font-semibold leading-tight text-slate-100 sm:text-5xl">
              Practical technology for retailers who need clarity, control, and calm operations.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
              We help teams design lean inventory workflows, implement dependable tooling, and ship outcomes—not slide
              decks. When you are ready to run the floor from one source of truth, we are here.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup?plan=trial"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#04123b] transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
              >
                Start free trial
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
              >
                View pricing
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-400">{BRAND.poweredBy}</p>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16" aria-labelledby="services-heading">
          <h2 id="services-heading" className="text-2xl font-semibold text-slate-100">
            How we help
          </h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Focused engagements across process, product, and engineering—so your stores stay in sync with reality.
          </p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <li className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-slate-100">Operations &amp; inventory design</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Receipts, issues, transfers, and counts—mapped to how your teams actually work, with guardrails that
                prevent silent stock drift.
              </p>
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-slate-100">Implementation &amp; integrations</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                From spreadsheets to a governed system: sensible data models, APIs, exports, and reporting your finance
                team can trust.
              </p>
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:col-span-2 lg:col-span-1">
              <h3 className="text-lg font-semibold text-slate-100">Enablement &amp; steady support</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Training, playbooks, and a calm path through change—so adoption sticks after launch week.
              </p>
            </li>
          </ul>
        </section>

        <section id="ims" className="border-y border-white/10 bg-[#030b2a]/70" aria-labelledby="ims-heading">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <h2 id="ims-heading" className="text-2xl font-semibold text-slate-100">
              {BRAND.productName}
            </h2>
            <p className="mt-1 text-sm font-medium text-indigo-200/90">{BRAND.poweredBy}</p>
            <p className="mt-2 max-w-2xl text-slate-300">
              Our inventory management workspace for multi-store retail: products, goods movements, purchase orders,
              sales quotations, reporting, and role-based access.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#04123b] transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
              >
                {BRAND.loginTitle}
              </Link>
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
              >
                Discuss {BRAND.productName}
              </a>
            </div>
          </div>
        </section>

        <PricingSection />

        <section id="contact" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="text-2xl font-semibold text-slate-100">
            Contact
          </h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Tell us about your stores, pain points, and timeline. We will respond with a clear next step—usually a short
            discovery call.
          </p>
          <address className="mt-8 not-italic">
            <p className="text-sm font-medium text-slate-100">{BRAND.companyName}</p>
            <p className="mt-1 text-sm text-slate-300">
              Web:{' '}
              <a className="text-violet-300 underline-offset-2 hover:underline" href={BRAND.siteOrigin}>
                {BRAND.siteOrigin.replace(/^https:\/\//, '')}
              </a>
            </p>
            <p className="mt-3 text-sm text-slate-300">
              For existing users, use{' '}
              <Link className="font-medium text-violet-300 underline-offset-2 hover:underline" to="/login">
                the sign-in page
              </Link>
              .
            </p>
          </address>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#030b2a]/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{BRAND.copyright(new Date().getFullYear())}</p>
          <p>
            <Link to="/login" className="font-medium text-violet-300 underline-offset-2 hover:underline">
              {BRAND.productName} sign-in
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
