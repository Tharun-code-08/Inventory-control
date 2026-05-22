import { useMemo, useState } from 'react';
import { ExternalLink, Copy, Send, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRfqs } from '@/hooks/use-rfqs';
import { supplierPortalSubmitUrl } from '@/lib/portal-api';

export function SupplierPortalManagePage() {
  const { data: rfqs = [] } = useRfqs();
  const sentRfqs = useMemo(
    () => rfqs.filter((r) => r.status === 'POSTED'),
    [rfqs],
  );
  const [linkRfqId, setLinkRfqId] = useState<string>('');

  const portalUrl = useMemo(
    () => supplierPortalSubmitUrl(linkRfqId && linkRfqId !== '_none' ? linkRfqId : undefined),
    [linkRfqId],
  );

  function copyLink() {
    void navigator.clipboard.writeText(portalUrl);
    toast.success('Portal link copied');
  }

  function openPortalTab() {
    window.open(portalUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <AppLayout active="Supplier Portal">
      <div className="space-y-6">
        <PageHeader
          title="Supplier Portal"
          description="Share a self-service link so suppliers can verify identity and submit quotes without logging in."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Card className="border-indigo-100/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5 text-indigo-600" />
                Portal access link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-slate-600">
                Send this link when you distribute an RFQ. Suppliers enter their registered email
                and company name, review line items, and submit pricing.
              </p>

              <div className="space-y-2">
                <Label className="text-xs">Pre-select RFQ (optional)</Label>
                <Select
                  value={linkRfqId || '_none'}
                  onValueChange={(v) => setLinkRfqId(v === '_none' ? '' : v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="General portal link" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Any open RFQ for that supplier</SelectItem>
                    {sentRfqs.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.rfqNumber} — {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Input readOnly value={portalUrl} className="h-9 font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </Button>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  How it works
                </p>
                <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-600">
                  <li>Share the portal link when you send an RFQ.</li>
                  <li>Supplier verifies email and company name against your master data.</li>
                  <li>They review RFQ line items and specifications.</li>
                  <li>They enter unit prices, lead time, and notes.</li>
                  <li>Quotes appear in Quotations and linked RFQ responses.</li>
                  <li>Compare bids and award contracts from RFQs / Contracts.</li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={openPortalTab}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open portal (new tab)
                </Button>
                <Button type="button" variant="outline" asChild>
                  <a href="/rfqs">
                    <Send className="mr-2 h-4 w-4" />
                    Manage RFQs
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Portal status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-slate-800">Active</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  External suppliers can submit quotes on posted RFQs they are invited to.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  'Send the RFQ before sharing the link',
                  'Supplier email must match master data',
                  'Quotes show under Quotations',
                ].map((tip) => (
                  <p
                    key={tip}
                    className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600"
                  >
                    {tip}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
