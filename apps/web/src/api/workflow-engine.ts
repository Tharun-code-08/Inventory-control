import { api as apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DeliveryFunnel {
  byState: Record<string, number>;
  total: number;
}
export interface EngagementSummary {
  sent: number;
  read: number;
  replied: number;
  paid: number;
  readRate: number;
  replyRate: number;
  conversionRate: number;
}
export interface ChannelBreakdown {
  channel: string;
  count: number;
}
export interface PortfolioForecast {
  invoices: number;
  expectedRecovery: number;
  totalOutstanding: number;
  recoveryRate: number;
}
export interface InvoiceScore {
  paymentLikelihood: number;
  churnRisk: number;
  nextBestAction: { action: string; rationale: string };
}
export interface OptimizerRec {
  key: string;
  channel: string;
  conversionRate: number;
  sampleSize: number;
  recommendation: string;
  note: string;
}
export interface AssistantAction {
  id: string;
  kind: string;
  scope: string;
  refId: string;
  content: string;
  rationale: string | null;
  status: string;
  createdAt: string;
}
export interface WorkflowNodeDef {
  key: string;
  kind: string;
  label?: string;
  action?: { type: string; channel?: string; tone?: string };
  waitHours?: number;
  escalateTo?: string;
  terminalReason?: string;
}
export interface WorkflowEdgeDef {
  from: string;
  to: string;
  when?: boolean;
}
export interface WorkflowGraphDef {
  key: string;
  name: string;
  nodes: WorkflowNodeDef[];
  edges: WorkflowEdgeDef[];
}
export interface PublishedWorkflow {
  graphId: string;
  version: number;
  workflow: { key: string; name: string; entryKey: string; nodes: Record<string, WorkflowNodeDef> };
}
export interface SimulatedStep {
  day: number;
  at: string;
  kind: string;
  nodeKey: string;
  detail: string;
}

const unwrap = <T>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

// ── Analytics (§12) ──────────────────────────────────────────────────────────
export const getDeliveryFunnel = async () =>
  unwrap<DeliveryFunnel>(await apiClient.get('/workflow-engine/analytics/delivery-funnel'));
export const getEngagement = async () =>
  unwrap<EngagementSummary>(await apiClient.get('/workflow-engine/analytics/engagement'));
export const getChannels = async () =>
  unwrap<ChannelBreakdown[]>(await apiClient.get('/workflow-engine/analytics/channels'));
export const getAiAccuracy = async () =>
  unwrap<{ evaluated: number; correct: number; accuracy: number }>(
    await apiClient.get('/workflow-engine/analytics/ai-accuracy'),
  );

// ── Predictive (Phase 6) ───────────────────────────────────────────────────────
export const getPortfolioForecast = async () =>
  unwrap<PortfolioForecast>(await apiClient.get('/workflow-engine/predictive/portfolio'));
export const getInvoiceScore = async (invoiceId: string) =>
  unwrap<InvoiceScore | null>(await apiClient.get(`/workflow-engine/predictive/invoice/${invoiceId}`));

// ── Optimizer (Phase 4) ────────────────────────────────────────────────────────
export const getOptimizerRecs = async () =>
  unwrap<OptimizerRec[]>(await apiClient.get('/workflow-engine/optimizer/recommendations'));

// ── Assistant (Phase 7) ────────────────────────────────────────────────────────
export const listAssistantActions = async (status?: string) =>
  unwrap<AssistantAction[]>(
    await apiClient.get('/workflow-engine/assistant/actions', { params: status ? { status } : {} }),
  );
export const proposeDraft = async (invoiceId: string, tone: string) =>
  unwrap<AssistantAction>(await apiClient.post('/workflow-engine/assistant/draft', { invoiceId, tone }));
export const approveAction = async (id: string) =>
  unwrap<AssistantAction>(await apiClient.post(`/workflow-engine/assistant/actions/${id}/approve`, {}));
export const rejectAction = async (id: string) =>
  unwrap<AssistantAction>(await apiClient.post(`/workflow-engine/assistant/actions/${id}/reject`, {}));

// ── Workflows (§6) + Simulation (§10) ──────────────────────────────────────────
export const getPublishedWorkflow = async (key: string) =>
  unwrap<PublishedWorkflow | null>(await apiClient.get(`/workflow-engine/workflows/${key}`));
export const publishWorkflow = async (key: string, def: WorkflowGraphDef) =>
  unwrap<PublishedWorkflow>(await apiClient.post(`/workflow-engine/workflows/${key}/publish`, def));
export const simulate = async (body: { workflowKey?: string; paidOnDay?: number }) =>
  unwrap<SimulatedStep[]>(await apiClient.post('/workflow-engine/simulate', body));

// ── Feature flags (§10) ────────────────────────────────────────────────────────
export const setFeature = async (feature: string, enabled: boolean) =>
  apiClient.post(`/workflow-engine/features/${feature}`, { enabled });

// ── Policies (§7) ──────────────────────────────────────────────────────────────
export interface Policy {
  id: string;
  name: string;
  scope: string;
  enabled: boolean;
  priority: number;
  condition: unknown;
  action: unknown;
}
export interface PolicyInput {
  name: string;
  scope?: string;
  enabled?: boolean;
  priority?: number;
  condition: unknown;
  action: unknown;
}
export const listPolicies = async () => unwrap<Policy[]>(await apiClient.get('/workflow-engine/policies'));
export const createPolicy = async (body: PolicyInput) =>
  unwrap<Policy>(await apiClient.post('/workflow-engine/policies', body));
export const updatePolicy = async (id: string, body: Partial<PolicyInput>) =>
  unwrap<Policy>(await apiClient.patch(`/workflow-engine/policies/${id}`, body));
export const deletePolicy = async (id: string) => apiClient.delete(`/workflow-engine/policies/${id}`);
