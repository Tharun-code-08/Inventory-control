import { Link } from 'react-router-dom';

const SITE_ORIGIN = 'https://softdigitconsulting.com';

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600"
      >
        Skip to main content
      </a>

      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/favicon.svg"
              width={40}
              height={40}
              alt="Softdigit Consulting logo"
              className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white p-1"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">Softdigit Consulting</p>
              <p className="truncate text-xs text-slate-600">Retail operations &amp; technology</p>
            </div>
          </div>
          <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-4">
            <a
              href="#services"
              className="hidden rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 sm:inline-block"
            >
              Services
            </a>
            <a
              href="#ims"
              className="hidden rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 md:inline-block"
            >
              Retail IMS
            </a>
            <a
              href="#contact"
              className="hidden rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 lg:inline-block"
            >
              Contact
            </a>
            <Link
              to="/login"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Sign in to Retail IMS
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50" aria-labelledby="hero-heading">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Softdigit Consulting</p>
            <h1 id="hero-heading" className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Practical technology for retailers who need clarity, control, and calm operations.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-600">
              We help teams design lean inventory workflows, implement dependable tooling, and ship outcomes—not slide
              decks. When you are ready to run the floor from one source of truth, we are here.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                Open Retail IMS
              </Link>
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Talk to us
              </a>
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16" aria-labelledby="services-heading">
          <h2 id="services-heading" className="text-2xl font-semibold text-slate-900">
            How we help
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Focused engagements across process, product, and engineering—so your stores stay in sync with reality.
          </p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <li className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Operations &amp; inventory design</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Receipts, issues, transfers, and counts—mapped to how your teams actually work, with guardrails that
                prevent silent stock drift.
              </p>
            </li>
            <li className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Implementation &amp; integrations</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                From spreadsheets to a governed system: sensible data models, APIs, exports, and reporting your finance
                team can trust.
              </p>
            </li>
            <li className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-1">
              <h3 className="text-lg font-semibold text-slate-900">Enablement &amp; steady support</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Training, playbooks, and a calm path through change—so adoption sticks after launch week.
              </p>
            </li>
          </ul>
        </section>

        <section id="ims" className="border-y border-slate-200 bg-white" aria-labelledby="ims-heading">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <h2 id="ims-heading" className="text-2xl font-semibold text-slate-900">
              Retail IMS
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Our inventory management workspace for multi-store retail: products, goods movements, purchase orders,
              reporting, and role-based access—hosted on this domain for your team.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign in to Retail IMS
              </Link>
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Discuss Retail IMS
              </a>
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="text-2xl font-semibold text-slate-900">
            Contact
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Tell us about your stores, pain points, and timeline. We will respond with a clear next step—usually a short
            discovery call.
          </p>
          <address className="mt-8 not-italic">
            <p className="text-sm font-medium text-slate-900">Softdigit Consulting</p>
            <p className="mt-1 text-sm text-slate-600">
              Web:{' '}
              <a className="text-indigo-700 underline-offset-2 hover:underline" href={SITE_ORIGIN}>
                {SITE_ORIGIN.replace(/^https:\/\//, '')}
              </a>
            </p>
            <p className="mt-3 text-sm text-slate-600">
              For existing Retail IMS users, use{' '}
              <Link className="font-medium text-indigo-700 underline-offset-2 hover:underline" to="/login">
                the sign-in page
              </Link>
              .
            </p>
          </address>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Softdigit Consulting. All rights reserved.</p>
          <p>
            <Link to="/login" className="font-medium text-indigo-700 underline-offset-2 hover:underline">
              Retail IMS sign-in
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
