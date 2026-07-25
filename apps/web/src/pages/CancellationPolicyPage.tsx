import { Link } from 'react-router-dom';
import { BRAND } from '@/lib/brand';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

const EFFECTIVE_DATE = '25 July 2026';
const CONTACT_EMAIL = 'office@softdigitconsulting.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export function CancellationPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Cancellation &amp; Refund Policy
          </h1>
          <p className="mt-3 text-sm text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

          <Section title="How to cancel">
            <p>
              To cancel your {BRAND.productName} subscription, email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
                {CONTACT_EMAIL}
              </a>{' '}
              from the email address registered to your account. Include your organisation name.
              We will process your cancellation within 1 business day and send a confirmation.
            </p>
            <p>
              Self-service cancellation in the account settings is on our roadmap and will be
              available soon.
            </p>
          </Section>

          <Section title="Access after cancellation">
            <p>
              <strong>Monthly plans:</strong> your access continues until the end of the current
              billing month. No further charges will be made after cancellation is confirmed.
            </p>
            <p>
              <strong>Annual plans:</strong> your access continues until the end of the paid
              annual period.
            </p>
            <p>
              After the access period ends, your account is moved to a read-only state for 30 days
              so you can export your data. After 30 days active access is suspended. Your data is
              not deleted: under the CGST Act (Section 36) GST-related records must be retained for
              72 months from the due date of the relevant annual return, and under the Companies Act
              2013 financial records must be retained for eight years. We retain your business data
              for the duration of these statutory obligations. You may reactivate at any time by
              subscribing again.
            </p>
          </Section>

          <Section title="Refund eligibility">
            <p>
              <strong>Trial period:</strong> no charge is made during the 7-day free trial, so no
              refund applies.
            </p>
            <p>
              <strong>Monthly plans:</strong> we do not offer partial-month refunds. If you
              cancel, you retain access for the remainder of the period you have paid for.
            </p>
            <p>
              <strong>Annual plans:</strong> if you cancel within 7 days of the annual payment
              and have made minimal use of the platform in that period, you may be eligible for a
              pro-rata refund for the unused months at our discretion. Contact us at the email above
              to request one. Outside this window, no refund is available but access continues for
              the paid year.
            </p>
            <p>
              <strong>Technical failure:</strong> if a payment was charged but the platform was
              unavailable for an extended period due solely to our error, we will consider a
              pro-rata credit or refund on a case-by-case basis. Contact us with details of the
              incident.
            </p>
          </Section>

          <Section title="How refunds are issued">
            <p>
              Approved refunds are processed via Razorpay back to the original payment method
              within 5–7 business days. Razorpay's processing times may vary. We will email you
              confirmation when a refund has been initiated.
            </p>
          </Section>

          <Section title="Disputes">
            <p>
              If you believe a charge was made in error, contact us within 30 days of the charge
              date. We will investigate and respond within 5 business days. Raising a chargeback
              with your bank before contacting us may delay resolution.
            </p>
          </Section>

          <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-400">
            <p>
              See also:{' '}
              <Link to="/privacy" className="text-primary underline">
                Privacy Policy
              </Link>{' '}
              ·{' '}
              <Link to="/terms" className="text-primary underline">
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
