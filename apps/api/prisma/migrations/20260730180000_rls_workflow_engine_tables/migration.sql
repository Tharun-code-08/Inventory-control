-- Row-level tenant isolation for the Workflow & Automation Engine tables,
-- matching the existing pattern (rls_phase1 / force_rls_tenant_tables):
--   * policies allow access when app.current_company_id is unset (background
--     jobs / seeding), and enforce company scoping when the request sets it via
--     TenantRlsInterceptor + PrismaService.$allOperations;
--   * FORCE ROW LEVEL SECURITY so the table owner is subject to the policy too.
-- Company-scoped by a direct company_id column, except:
--   * workflow_graphs.company_id is NULL for system-default graphs (visible to
--     every tenant);
--   * workflow_versions / workflow_nodes have no company_id — scoped via their
--     parent graph.

-- ── Tables with a direct company_id ─────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'recipient_engagements',
    'notification_policies',
    'notification_timeline',
    'ai_memory',
    'assistant_actions',
    'dispatch_batch_items',
    'customer_activities',
    'workflow_decision_logs'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_%I_company ON %I;', t, t);
      EXECUTE format(
        'CREATE POLICY rls_%I_company ON %I USING ('
        || 'current_setting(''app.current_company_id'', true) IS NULL '
        || 'OR company_id = current_setting(''app.current_company_id'', true)::uuid);',
        t, t);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    END IF;
  END LOOP;
END $$;

-- ── workflow_graphs (nullable company_id = system default, visible to all) ───
DO $$
BEGIN
  IF to_regclass('public.workflow_graphs') IS NOT NULL THEN
    ALTER TABLE workflow_graphs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_workflow_graphs_company ON workflow_graphs;
    CREATE POLICY rls_workflow_graphs_company ON workflow_graphs
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR company_id IS NULL
        OR company_id = current_setting('app.current_company_id', true)::uuid
      );
    ALTER TABLE workflow_graphs FORCE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ── workflow_versions (scoped via parent graph) ─────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.workflow_versions') IS NOT NULL THEN
    ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_workflow_versions_company ON workflow_versions;
    CREATE POLICY rls_workflow_versions_company ON workflow_versions
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM workflow_graphs g
          WHERE g.id = graph_id
            AND (g.company_id IS NULL
                 OR g.company_id = current_setting('app.current_company_id', true)::uuid)
        )
      );
    ALTER TABLE workflow_versions FORCE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ── workflow_nodes (scoped via version -> graph) ────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.workflow_nodes') IS NOT NULL THEN
    ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_workflow_nodes_company ON workflow_nodes;
    CREATE POLICY rls_workflow_nodes_company ON workflow_nodes
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM workflow_versions v
          JOIN workflow_graphs g ON g.id = v.graph_id
          WHERE v.id = version_id
            AND (g.company_id IS NULL
                 OR g.company_id = current_setting('app.current_company_id', true)::uuid)
        )
      );
    ALTER TABLE workflow_nodes FORCE ROW LEVEL SECURITY;
  END IF;
END $$;
