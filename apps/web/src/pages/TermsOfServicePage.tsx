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

export function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

          <Section title="1. Acceptance">
            <p>
              By creating an account or using {BRAND.productName} (the "Service"), you agree to
              these Terms on behalf of yourself and the organisation you represent. If you do not
              agree, do not use the Service.
            </p>
          </Section>

          <Section title="2. Service description">
            <p>
              {BRAND.productName} is a cloud-based inventory and procurement ERP platform provided
              by {BRAND.companyName}. Features available to you depend on your subscription plan
              and are subject to change with reasonable notice.
            </p>
          </Section>

          <Section title="3. Accounts and access">
            <p>
              You are responsible for maintaining the security of your account credentials and for
              all activity that occurs under your account. You must notify us immediately of any
              unauthorised access. We recommend enabling multi-factor authentication.
            </p>
            <p>
              Each subscription is issued to a single organisation. You may not share credentials
              or resell access to the platform.
            </p>
          </Section>

          <Section title="4. Subscriptions and billing">
            <p>
              Subscriptions are available on monthly and annual billing cycles. Fees are charged in
              Indian Rupees (INR) and processed by Razorpay. All charges are exclusive of applicable
              taxes.
            </p>
            <p>
              Trial periods are 7 days and do not require a payment method. At the end of the trial
              your account access is restricted until a paid plan is activated.
            </p>
            <p>
              We reserve the right to change pricing with 30 days' prior notice to existing
              subscribers.
            </p>
          </Section>

          <Section title="5. Cancellation and refunds">
            <p>
              You may cancel your subscription at any time. See our{' '}
              <Link to="/cancellation" className="text-primary underline">
                Cancellation &amp; Refund Policy
              </Link>{' '}
              for full details on access after cancellation and eligibility for refunds.
            </p>
          </Section>

          <Section title="6. Your data">
            <p>
              You retain ownership of all data you enter into the platform. We process it only to
              provide the Service and as described in our{' '}
              <Link to="/privacy" className="text-primary underline">
                Privacy Policy
              </Link>
              . We will not access your business data except to provide support at your request or
              to investigate security incidents.
            </p>
            <p>
              You are responsible for ensuring your use of the platform complies with applicable
              laws, including GST filing obligations and data protection requirements.
            </p>
          </Section>

          <Section title="7. Acceptable use">
            <p>You agree not to:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to gain unauthorised access to the platform or other users' data.</li>
              <li>Interfere with the availability or integrity of the Service.</li>
              <li>Reverse-engineer, copy, or create derivative products based on the Service.</li>
              <li>Use automated tools to scrape or bulk-download data from the platform.</li>
            </ul>
          </Section>

          <Section title="8. Service availability">
            <p>
              We target high availability but do not guarantee uninterrupted service. Planned
              maintenance will be communicated in advance where possible. We are not liable for
              losses resulting from downtime beyond our reasonable control.
            </p>
          </Section>

          <Section title="9. Limitation of liability">
            <p>
              To the maximum extent permitted by Indian law, {BRAND.companyName}'s aggregate
              liability for any claim arising from use of the Service is limited to the fees paid
              by you in the three months preceding the claim. We are not liable for indirect,
              incidental, or consequential damages.
            </p>
          </Section>

          <Section title="10. Governing law">
            <p>
              These Terms are governed by the laws of India. Disputes shall be subject to the
              exclusive jurisdiction of the courts located in Chennai, Tamil Nadu.
            </p>
          </Section>

          <Section title="11. Changes to these Terms">
            <p>
              We may update these Terms and will notify registered users by email at least 14 days
              before material changes take effect. Continued use of the Service after the effective
              date constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              For questions about these Terms, contact{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-400">
            <p>
              See also:{' '}
              <Link to="/privacy" className="text-primary underline">
                Privacy Policy
              </Link>{' '}
              ·{' '}
              <Link to="/cancellation" className="text-primary underline">
                Cancellation &amp; Refund Policy
              </Link>
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
