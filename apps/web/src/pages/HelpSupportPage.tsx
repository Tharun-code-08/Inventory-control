import { Keyboard, Mail } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { HelpGuideAccordion } from '@/components/help/HelpGuideAccordion';
import { WorkflowCards } from '@/components/help/WorkflowCards';
import { PageHeader } from '@/components/shared/page-header';
import {
  HELP_GUIDES,
  KEYBOARD_SHORTCUTS,
  SUPPORT_CONTACT,
} from '@/lib/help-content';
import { BRAND } from '@/lib/brand';

export function HelpSupportPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Help & Support"
        description={`Guides, workflows, and shortcuts for ${BRAND.productName}.`}
      />

      <div className="space-y-6">
        <HelpGuideAccordion guides={HELP_GUIDES} />
        <WorkflowCards />

        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Keyboard className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Keyboard Shortcuts
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-semibold">Shortcut</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {KEYBOARD_SHORTCUTS.map((row) => (
                  <tr
                    key={row.keys}
                    className="border-b border-slate-50 last:border-0 dark:border-slate-800/80"
                  >
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                      {row.keys}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary dark:bg-slate-950 dark:text-slate-300">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Contact Support
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-700 dark:text-slate-200">Email: </span>
                <a
                  href={`mailto:${SUPPORT_CONTACT.email}`}
                  className="text-primary hover:underline dark:text-slate-400"
                >
                  {SUPPORT_CONTACT.email}
                </a>
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-700 dark:text-slate-200">Company: </span>
                {SUPPORT_CONTACT.company} — {SUPPORT_CONTACT.location}
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
