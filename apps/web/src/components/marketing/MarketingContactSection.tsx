import { Link } from 'react-router-dom';
import { MARKETING_CONTACT } from '@/lib/marketing-content';
import { Reveal } from '@/components/motion';

export function MarketingContactSection() {
  return (
    <section id="contact" className="bg-white py-16 sm:py-20" aria-labelledby="contact-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 id="contact-heading" className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {MARKETING_CONTACT.title}
          </h2>
          <p className="mt-4 text-lg text-slate-600">{MARKETING_CONTACT.body}</p>
        </Reveal>
        <Reveal delay={100}>
          <address className="mx-auto mt-10 max-w-md not-italic rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{MARKETING_CONTACT.companyName}</p>
            <p className="mt-2 text-sm text-slate-600">
              Web:{' '}
              <a className="font-medium text-indigo-600 hover:underline" href={MARKETING_CONTACT.siteUrl}>
                {MARKETING_CONTACT.siteLabel}
              </a>
            </p>
            <p className="mt-4 text-sm text-slate-600">
              For existing users, use{' '}
              <Link className="font-medium text-indigo-600 hover:underline" to="/login">
                the sign-in page
              </Link>
              .
            </p>
          </address>
        </Reveal>
      </div>
    </section>
  );
}
