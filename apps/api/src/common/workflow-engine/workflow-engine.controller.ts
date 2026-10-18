import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { RequestUser } from '@/common/types/request-user';
import { AnalyticsRange, AnalyticsService } from './analytics/analytics.service';
import { TimelineService } from './analytics/timeline.service';
import { SimulationScenario, SimulationService } from './ops/simulation.service';
import { FeatureFlagsService, WorkflowFeature } from './ops/feature-flags.service';
import { WorkflowRegistryService } from './graph/workflow-registry.service';
import { WorkflowGraphDef } from './graph/graph-types';
import { PredictiveService } from './predictive/predictive.service';
import { OptimizerService } from './optimizer/optimizer.service';
import { AssistantService } from './assistant/assistant.service';
import { AssistantTone } from './assistant/assistant-core';
import { PolicyService, PolicyInput } from './policy/policy.service';

/**
 * Read + admin surface for the Workflow & Automation Engine (Plan §12 dashboards,
 * §10 simulation/feature-flags, §5/§6 workflow publishing). JWT-guarded and
 * tenant-scoped: every handler reads companyId from the authenticated user.
 * Read endpoints are open to any authenticated user; mutating endpoints
 * (publish, policy CRUD, feature flags, assistant proposals/approvals) require
 * OWNER/ADMIN via {@link RolesGuard}.
 */
@ApiTags('Workflow Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflow-engine')
export class WorkflowEngineController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly timeline: TimelineService,
    private readonly simulation: SimulationService,
    private readonly features: FeatureFlagsService,
    private readonly registry: WorkflowRegistryService,
    private readonly predictive: PredictiveService,
    private readonly optimizer: OptimizerService,
    private readonly assistant: AssistantService,
    private readonly policies: PolicyService,
  ) {}

  private range(from?: string, to?: string): AnalyticsRange {
    return { from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined };
  }

  @Get('analytics/delivery-funnel')
  @ApiOperation({ summary: 'Delivery funnel counts by state' })
  deliveryFunnel(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.deliveryFunnel(user.companyId!, this.range(from, to));
  }

  @Get('analytics/channels')
  @ApiOperation({ summary: 'Delivery counts by channel' })
  channels(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.channelSuccess(user.companyId!, this.range(from, to));
  }

  @Get('analytics/engagement')
  @ApiOperation({ summary: 'Sent → read → replied → paid funnel with rates' })
  engagement(@CurrentUser() user: RequestUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.engagementSummary(user.companyId!, this.range(from, to));
  }

  @Get('analytics/ai-accuracy')
  @ApiOperation({ summary: 'AI channel-preference accuracy vs actual engagement' })
  aiAccuracy(@CurrentUser() user: RequestUser) {
    return this.analytics.aiChannelAccuracy(user.companyId!);
  }

  @Get('timeline/:entityType/:entityId')
  @ApiOperation({ summary: 'Full notification timeline for an entity' })
  entityTimeline(
    @CurrentUser() user: RequestUser,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.timeline.forEntity(user.companyId!, entityType, entityId);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Dry-run a workflow scenario (no messages are sent)' })
  simulate(@CurrentUser() user: RequestUser, @Body() body: Omit<SimulationScenario, 'companyId'>) {
    return this.simulation.simulate({ ...body, companyId: user.companyId! });
  }

  @Get('workflows/:key')
  @ApiOperation({ summary: 'The currently-published workflow for this tenant' })
  workflow(@CurrentUser() user: RequestUser, @Param('key') key: string) {
    return this.registry.getPublished(user.companyId!, key);
  }

  @Post('workflows/:key/publish')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Compile + publish a new immutable workflow version' })
  publish(@CurrentUser() user: RequestUser, @Param('key') key: string, @Body() def: WorkflowGraphDef) {
    return this.registry.publish(user.companyId!, { ...def, key });
  }

  @Post('features/:feature')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Enable/disable a workflow feature for this tenant' })
  setFeature(
    @CurrentUser() user: RequestUser,
    @Param('feature') feature: WorkflowFeature,
    @Body() body: { enabled: boolean },
  ) {
    return this.features.setEnabled(user.companyId!, feature, body.enabled === true);
  }

  // ── Predictive AI (Phase 6) ────────────────────────────────────────────────
  @Get('predictive/portfolio')
  @ApiOperation({ summary: 'Expected collection recovery across open invoices' })
  portfolio(@CurrentUser() user: RequestUser) {
    return this.predictive.portfolioForecast(user.companyId!);
  }

  @Get('predictive/invoice/:invoiceId')
  @ApiOperation({ summary: 'Payment likelihood / churn / next-best-action for an invoice' })
  scoreInvoice(@CurrentUser() user: RequestUser, @Param('invoiceId') invoiceId: string) {
    return this.predictive.scoreInvoice(user.companyId!, invoiceId);
  }

  // ── Optimizer (Phase 4) ────────────────────────────────────────────────────
  @Get('optimizer/recommendations')
  @ApiOperation({ summary: 'Template/channel recommendations (advisory)' })
  optimizerRecs(@CurrentUser() user: RequestUser, @Query('since') since?: string) {
    return this.optimizer.recommend(user.companyId!, since ? new Date(since) : undefined);
  }

  // ── Autonomous assistant (Phase 7) — proposals need human approval ──────────
  @Post('assistant/draft')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Propose a dunning message draft (pending approval)' })
  draft(@CurrentUser() user: RequestUser, @Body() body: { invoiceId: string; tone: AssistantTone }) {
    return this.assistant.proposeDraft(user.companyId!, body.invoiceId, body.tone, user.id);
  }

  @Post('assistant/summary')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Propose a thread summary (pending approval)' })
  summary(@CurrentUser() user: RequestUser, @Body() body: { entityType: string; entityId: string }) {
    return this.assistant.proposeSummary(user.companyId!, body.entityType, body.entityId, user.id);
  }

  @Post('assistant/escalation')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Propose an escalation decision (pending approval)' })
  escalation(@CurrentUser() user: RequestUser, @Body() body: { invoiceId: string }) {
    return this.assistant.proposeEscalation(user.companyId!, body.invoiceId, user.id);
  }

  @Get('assistant/actions')
  @ApiOperation({ summary: 'List assistant proposals (optionally by status)' })
  assistantActions(@CurrentUser() user: RequestUser, @Query('status') status?: string) {
    return this.assistant.list(user.companyId!, status);
  }

  @Post('assistant/actions/:id/approve')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Approve an assistant proposal (human gate)' })
  approve(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.assistant.approve(user.companyId!, id, user.id);
  }

  @Post('assistant/actions/:id/reject')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Reject an assistant proposal' })
  reject(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.assistant.reject(user.companyId!, id, user.id);
  }

  // ── Policy CRUD (§7) ────────────────────────────────────────────────────────
  @Get('policies')
  @ApiOperation({ summary: 'List notification/dunning policies' })
  listPolicies(@CurrentUser() user: RequestUser, @Query('scope') scope?: string) {
    return this.policies.list(user.companyId!, scope);
  }

  @Post('policies')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Create a policy (condition → action)' })
  createPolicy(@CurrentUser() user: RequestUser, @Body() body: PolicyInput) {
    return this.policies.create(user.companyId!, body);
  }

  @Patch('policies/:id')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Update a policy' })
  updatePolicy(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Partial<PolicyInput>) {
    return this.policies.update(user.companyId!, id, body);
  }

  @Delete('policies/:id')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Delete a policy' })
  deletePolicy(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.policies.remove(user.companyId!, id);
  }

}
