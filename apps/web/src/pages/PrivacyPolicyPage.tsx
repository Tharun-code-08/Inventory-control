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

export function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

          <Section title="1. Who we are">
            <p>
              {BRAND.productName} is a cloud-based inventory and procurement management platform
              operated by {BRAND.companyName} ("we", "us", or "our"), registered in India. This
              policy explains what personal data we collect, how we use it, and your rights in
              relation to it.
            </p>
            <p>
              For questions, contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Data we collect">
            <p>
              <strong>Account data:</strong> name, email address, business name, GST number, phone
              number, and billing address provided during signup or settings updates.
            </p>
            <p>
              <strong>Business data:</strong> inventory records, purchase orders, sales orders,
              invoices, supplier and customer information, and other documents you create within the
              platform.
            </p>
            <p>
              <strong>Usage data:</strong> log data including IP address, browser type, pages
              visited, and actions performed, used for security and product improvement.
            </p>
            <p>
              <strong>Payment data:</strong> we do not store card or bank details. Payments are
              processed by Razorpay under their own privacy policy. We retain transaction IDs and
              plan history.
            </p>
          </Section>

          <Section title="3. How we use your data">
            <p>We use your data to:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Provide, maintain, and improve the {BRAND.productName} platform.</li>
              <li>Send transactional emails (OTPs, invoice notifications, subscription updates).</li>
              <li>Process and verify subscription payments via Razorpay.</li>
              <li>Respond to support requests and enforce our terms.</li>
              <li>
                Detect and prevent fraud, unauthorised access, and security incidents.
              </li>
              <li>
                Send lifecycle emails about your trial or subscription (you may opt out at any time
                via the unsubscribe link or the marketing opt-out in your account settings).
              </li>
            </ul>
            <p>We do not sell your personal data to third parties.</p>
          </Section>

          <Section title="4. Data sharing">
            <p>
              We share your data only with service providers necessary to operate the platform:
              Razorpay (payments), Zoho (transactional email delivery), our cloud infrastructure
              provider, and analytics tools operating under data processing agreements. We require
              all sub-processors to maintain equivalent security and confidentiality standards.
            </p>
          </Section>

          <Section title="5. Data retention">
            <p>
              We retain account and business data for the duration of your subscription and for as
              long as required by applicable Indian law. Under the CGST Act (Section 36), GST-related
              records must be retained for 72 months from the due date of the annual return for the
              relevant year. Under the Companies Act 2013, financial books and records must be
              retained for eight years from the end of the financial year to which they relate.
              Accordingly, we do not delete business data before the expiry of these mandatory
              retention periods, regardless of subscription status.
            </p>
            <p>
              You may request deletion of personal account data (name, contact details) that is not
              part of a statutory financial record by contacting us. We will comply where legally
              permissible.
            </p>
          </Section>

          <Section title="6. Security">
            <p>
              Data is stored encrypted at rest. Access is governed by role-based permissions and
              multi-factor authentication is available for all accounts. We maintain daily database
              backups with verified restore capability.
            </p>
          </Section>

          <Section title="7. Cookies">
            <p>
              We use session cookies required for authentication and, with your consent, analytics
              cookies (Google Analytics) to understand product usage. You can manage cookie
              preferences at any time via the Cookie Preferences link in the footer.
            </p>
          </Section>

          <Section title="8. Your rights">
            <p>
              You have the right to access, correct, or delete your personal data, and to withdraw
              consent for marketing communications. Submit requests to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
                {CONTACT_EMAIL}
              </a>
              . We will respond within 30 days.
            </p>
          </Section>

          <Section title="9. Changes to this policy">
            <p>
              We may update this policy from time to time. We will notify registered users by email
              of material changes at least 14 days before they take effect.
            </p>
          </Section>

          <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-400">
            <p>
              See also:{' '}
              <Link to="/terms" className="text-primary underline">
                Terms of Service
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
