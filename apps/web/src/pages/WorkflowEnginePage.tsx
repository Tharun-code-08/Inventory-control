import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Bot, Brain, GitBranch, PlayCircle, ScrollText, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import * as wf from '@/api/workflow-engine';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
const pct = (n: number) => `${n ?? 0}%`;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const engagement = useQuery({ queryKey: ['wf', 'engagement'], queryFn: wf.getEngagement });
  const funnel = useQuery({ queryKey: ['wf', 'funnel'], queryFn: wf.getDeliveryFunnel });
  const channels = useQuery({ queryKey: ['wf', 'channels'], queryFn: wf.getChannels });
  const accuracy = useQuery({ queryKey: ['wf', 'accuracy'], queryFn: wf.getAiAccuracy });

  const funnelData = useMemo(
    () => Object.entries(funnel.data?.byState ?? {}).map(([state, count]) => ({ state, count })),
    [funnel.data],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Sent" value={String(engagement.data?.sent ?? 0)} />
        <Stat label="Read rate" value={pct(engagement.data?.readRate ?? 0)} />
        <Stat label="Reply rate" value={pct(engagement.data?.replyRate ?? 0)} />
        <Stat label="Conversion" value={pct(engagement.data?.conversionRate ?? 0)} hint="sent → paid" />
      </div>

      <Card>
        <CardHeader><CardTitle>Delivery funnel</CardTitle></CardHeader>
        <CardContent style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="state" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Channels</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(channels.data ?? []).map((c) => (
              <div key={c.channel} className="flex justify-between text-sm">
                <span>{c.channel}</span><span className="font-medium">{c.count}</span>
              </div>
            ))}
            {channels.data?.length === 0 && <div className="text-sm text-muted-foreground">No deliveries yet.</div>}
          </CardContent>
        </Card>
        <Stat
          label="AI channel accuracy"
          value={pct(accuracy.data?.accuracy ?? 0)}
          hint={`${accuracy.data?.correct ?? 0}/${accuracy.data?.evaluated ?? 0} correct`}
        />
      </div>
    </div>
  );
}

function PredictiveTab() {
  const portfolio = useQuery({ queryKey: ['wf', 'portfolio'], queryFn: wf.getPortfolioForecast });
  const [invoiceId, setInvoiceId] = useState('');
  const score = useQuery({
    queryKey: ['wf', 'score', invoiceId],
    queryFn: () => wf.getInvoiceScore(invoiceId),
    enabled: false,
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Open invoices" value={String(portfolio.data?.invoices ?? 0)} />
        <Stat label="Outstanding" value={money(portfolio.data?.totalOutstanding ?? 0)} />
        <Stat label="Expected recovery" value={money(portfolio.data?.expectedRecovery ?? 0)} />
        <Stat label="Recovery rate" value={pct(Math.round((portfolio.data?.recoveryRate ?? 0) * 100))} />
      </div>

      <Card>
        <CardHeader><CardTitle>Score an invoice</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Invoice ID" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} />
            <Button onClick={() => score.refetch()} disabled={!invoiceId}>Score</Button>
          </div>
          {score.data && (
            <div className="grid grid-cols-3 gap-4 pt-2">
              <Stat label="Payment likelihood" value={pct(Math.round(score.data.paymentLikelihood * 100))} />
              <Stat label="Churn risk" value={pct(Math.round(score.data.churnRisk * 100))} />
              <Stat label="Next best action" value={score.data.nextBestAction.action} hint={score.data.nextBestAction.rationale} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AssistantTab() {
  const qc = useQueryClient();
  const actions = useQuery({ queryKey: ['wf', 'assistant'], queryFn: () => wf.listAssistantActions() });
  const [invoiceId, setInvoiceId] = useState('');
  const [tone, setTone] = useState('firm');

  const refresh = () => qc.invalidateQueries({ queryKey: ['wf', 'assistant'] });
  const draft = useMutation({
    mutationFn: () => wf.proposeDraft(invoiceId, tone),
    onSuccess: () => { toast.success('Draft proposed (pending approval)'); refresh(); },
    onError: () => toast.error('Could not create draft'),
  });
  const approve = useMutation({ mutationFn: wf.approveAction, onSuccess: () => { toast.success('Approved'); refresh(); } });
  const reject = useMutation({ mutationFn: wf.rejectAction, onSuccess: () => { toast('Rejected'); refresh(); } });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Propose a draft</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Invoice ID" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} />
          <select className="border rounded px-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value)}>
            {['friendly', 'reminder', 'firm', 'final', 'escalation'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <Button onClick={() => draft.mutate()} disabled={!invoiceId || draft.isPending}>Propose</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Proposals (human approval required)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Kind</TableHead><TableHead>Content</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {(actions.data ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell><Badge variant="outline">{a.kind}</Badge></TableCell>
                  <TableCell className="max-w-md truncate">{a.content}</TableCell>
                  <TableCell><Badge>{a.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-2">
                    {a.status === 'PENDING' && (
                      <>
                        <Button size="sm" onClick={() => approve.mutate(a.id)}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => reject.mutate(a.id)}>Reject</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {actions.data?.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No proposals.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const GRAPH_TEMPLATE = JSON.stringify(
  {
    key: 'invoice-dunning',
    name: 'Custom dunning',
    nodes: [
      { key: 'entry', kind: 'ENTRY' },
      { key: 'remind', kind: 'ACTION', action: { type: 'notify.customer', channel: 'AUTO', tone: 'reminder' } },
      { key: 'wait', kind: 'WAIT', waitHours: 72 },
      { key: 'gate', kind: 'CONDITION', condition: { type: 'invoice.paid' } },
      { key: 'done', kind: 'TERMINAL', terminalReason: 'paid' },
      { key: 'unresolved', kind: 'TERMINAL', terminalReason: 'unresolved' },
    ],
    edges: [
      { from: 'entry', to: 'remind' },
      { from: 'remind', to: 'wait' },
      { from: 'wait', to: 'gate' },
      { from: 'gate', to: 'done', when: true },
      { from: 'gate', to: 'unresolved', when: false },
    ],
  },
  null,
  2,
);

function WorkflowTab() {
  const published = useQuery({ queryKey: ['wf', 'graph'], queryFn: () => wf.getPublishedWorkflow('invoice-dunning') });
  const sim = useMutation({ mutationFn: () => wf.simulate({ workflowKey: 'invoice-dunning' }) });
  const [draft] = useState(GRAPH_TEMPLATE);
  const nodes = Object.values(published.data?.workflow.nodes ?? {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>invoice-dunning · v{published.data?.version ?? '—'}</CardTitle>
          <Button size="sm" variant="outline" onClick={() => sim.mutate()}>
            <PlayCircle className="w-4 h-4 mr-1" /> Simulate (never paid)
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-2">
            {nodes.map((n) => (
              <div key={n.key} className="border rounded p-2 text-sm flex justify-between">
                <span><Badge variant="outline" className="mr-2">{n.kind}</Badge>{n.label ?? n.key}</span>
                <span className="text-muted-foreground">
                  {n.action?.tone ?? (n.waitHours ? `${n.waitHours}h` : n.escalateTo ?? n.terminalReason ?? '')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Design workflow (drag-and-drop)</CardTitle></CardHeader>
        <CardContent>
          <WorkflowCanvas initial={JSON.parse(draft) as wf.WorkflowGraphDef} />
        </CardContent>
      </Card>

      {sim.data && (
        <Card>
          <CardHeader><CardTitle>Simulated timeline (dry run — no messages sent)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Day</TableHead><TableHead>Step</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
              <TableBody>
                {sim.data.filter((s) => s.kind !== 'WAIT').map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>{s.day}</TableCell>
                    <TableCell><Badge variant="outline">{s.kind}</Badge> {s.nodeKey}</TableCell>
                    <TableCell className="text-muted-foreground">{s.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PoliciesTab() {
  const qc = useQueryClient();
  const policies = useQuery({ queryKey: ['wf', 'policies'], queryFn: wf.listPolicies });
  const [name, setName] = useState('');
  const [scope, setScope] = useState('dunning');
  const [priority, setPriority] = useState('100');
  const [condition, setCondition] = useState('{ "fact": "amount", "op": "gt", "value": 100000 }');
  const [action, setAction] = useState('{ "escalateAfterHours": 24, "priority": "CRITICAL" }');
  const refresh = () => qc.invalidateQueries({ queryKey: ['wf', 'policies'] });

  const create = useMutation({
    mutationFn: () =>
      wf.createPolicy({
        name,
        scope,
        priority: Number(priority),
        condition: JSON.parse(condition),
        action: JSON.parse(action),
      }),
    onSuccess: () => { toast.success('Policy created'); setName(''); refresh(); },
    onError: (e: unknown) => toast.error(`Invalid policy: ${(e as Error).message}`),
  });
  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => wf.updatePolicy(id, { enabled }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: wf.deletePolicy, onSuccess: () => { toast('Deleted'); refresh(); } });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>New policy (condition → action)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="border rounded px-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value)}>
              {['dunning', 'notification', '*'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <Input className="w-24" type="number" placeholder="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} />
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Condition (JSON)</div>
              <textarea className="w-full border rounded p-2 text-xs font-mono h-24" value={condition} onChange={(e) => setCondition(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Action (JSON)</div>
              <textarea className="w-full border rounded p-2 text-xs font-mono h-24" value={action} onChange={(e) => setAction(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>Create policy</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Scope</TableHead><TableHead>Priority</TableHead><TableHead>Enabled</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {(policies.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell><Badge variant="outline">{p.scope}</Badge></TableCell>
                  <TableCell>{p.priority}</TableCell>
                  <TableCell><Badge>{p.enabled ? 'on' : 'off'}</Badge></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: p.id, enabled: !p.enabled })}>
                      {p.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove.mutate(p.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {policies.data?.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No policies yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const FEATURES = ['channel-routing', 'graph-execution', 'ai-advisor', 'simulation', 'optimizer', 'predictive-ai'];

function FeaturesTab() {
  const set = useMutation({
    mutationFn: ({ f, on }: { f: string; on: boolean }) => wf.setFeature(f, on),
    onSuccess: (_d, v) => toast.success(`${v.f} ${v.on ? 'enabled' : 'disabled'}`),
    onError: () => toast.error('Could not update feature'),
  });
  return (
    <Card>
      <CardHeader><CardTitle>Feature flags (per tenant)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {FEATURES.map((f) => (
          <div key={f} className="flex items-center justify-between border rounded p-2">
            <span className="text-sm font-medium">{f}</span>
            <div className="space-x-2">
              <Button size="sm" onClick={() => set.mutate({ f, on: true })}>Enable</Button>
              <Button size="sm" variant="outline" onClick={() => set.mutate({ f, on: false })}>Disable</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function WorkflowEnginePage() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Workflow &amp; Automation Engine</h1>
        <p className="text-sm text-muted-foreground">Dunning analytics, predictions, AI proposals, and workflow control.</p>
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><Activity className="w-4 h-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="predictive"><Brain className="w-4 h-4 mr-1" />Predictive</TabsTrigger>
          <TabsTrigger value="assistant"><Bot className="w-4 h-4 mr-1" />Assistant</TabsTrigger>
          <TabsTrigger value="workflow"><GitBranch className="w-4 h-4 mr-1" />Workflow</TabsTrigger>
          <TabsTrigger value="policies"><ScrollText className="w-4 h-4 mr-1" />Policies</TabsTrigger>
          <TabsTrigger value="features"><ToggleLeft className="w-4 h-4 mr-1" />Features</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="predictive"><PredictiveTab /></TabsContent>
        <TabsContent value="assistant"><AssistantTab /></TabsContent>
        <TabsContent value="workflow"><WorkflowTab /></TabsContent>
        <TabsContent value="policies"><PoliciesTab /></TabsContent>
        <TabsContent value="features"><FeaturesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
