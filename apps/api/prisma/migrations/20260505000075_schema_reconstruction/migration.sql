-- Schema Reconstruction: Apply all missing tables
-- This migration captures the production database schema

-- agent_task_steps
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_task_steps') THEN
    CREATE TABLE public.agent_task_steps (
        id uuid NOT NULL,
        task_id uuid NOT NULL,
        "order" integer NOT NULL,
        name text NOT NULL,
        status public."AgentTaskStepStatus" DEFAULT 'PENDING'::public."AgentTaskStepStatus" NOT NULL,
        attempts integer DEFAULT 0 NOT NULL,
        result jsonb,
        error text,
        started_at timestamp(6) with time zone,
        completed_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- agent_tasks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_tasks') THEN
    CREATE TABLE public.agent_tasks (
        id uuid NOT NULL,
        task_number integer NOT NULL,
        company_id uuid NOT NULL,
        conversation_id uuid NOT NULL,
        requested_by uuid NOT NULL,
        type text NOT NULL,
        status public."AgentTaskStatus" DEFAULT 'DRAFT'::public."AgentTaskStatus" NOT NULL,
        payload jsonb NOT NULL,
        summary text NOT NULL,
        result jsonb,
        approved_by uuid,
        approved_at timestamp(6) with time zone,
        completed_at timestamp(6) with time zone,
        failure_reason text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- ai_prompt_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_prompt_history') THEN
    CREATE TABLE public.ai_prompt_history (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        version integer NOT NULL,
        body text NOT NULL,
        created_by uuid,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- ai_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_settings') THEN
    CREATE TABLE public.ai_settings (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        provider text DEFAULT 'deepseek'::text NOT NULL,
        intent_model text,
        reasoning_model text,
        escalation_model text,
        feature_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
        daily_request_limit integer,
        monthly_token_limit integer,
        monthly_cost_cents_limit integer,
        approval_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
        prompt_version integer DEFAULT 0 NOT NULL,
        system_prompt text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- ai_usage_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_usage_logs') THEN
    CREATE TABLE public.ai_usage_logs (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        conversation_id uuid,
        model text NOT NULL,
        role public."AiModelRole" NOT NULL,
        input_tokens integer DEFAULT 0 NOT NULL,
        output_tokens integer DEFAULT 0 NOT NULL,
        cost_cents integer DEFAULT 0 NOT NULL,
        tool_duration_ms integer,
        tool_errors integer DEFAULT 0 NOT NULL,
        escalated boolean DEFAULT false NOT NULL,
        human_handoff boolean DEFAULT false NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        tool_call_count integer DEFAULT 0 NOT NULL,
        tool_rounds integer DEFAULT 0 NOT NULL,
        duration_ms integer,
        timed_out boolean DEFAULT false NOT NULL
    );
  END IF;
END $$;

-- alert_events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alert_events') THEN
    CREATE TABLE public.alert_events (
        id uuid NOT NULL,
        alert_type public."AlertType" NOT NULL,
        severity text DEFAULT 'MEDIUM'::text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        shop_id uuid,
        reference_type text,
        reference_id text,
        is_read boolean DEFAULT false NOT NULL,
        triggered_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        resolved_at timestamp(6) with time zone
    );
  END IF;
END $$;

-- approval_comments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_comments') THEN
    CREATE TABLE public.approval_comments (
        id uuid NOT NULL,
        approval_id uuid NOT NULL,
        user_id uuid NOT NULL,
        comment text NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- approval_escalations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_escalations') THEN
    CREATE TABLE public.approval_escalations (
        id uuid NOT NULL,
        approval_id uuid NOT NULL,
        escalated_to uuid NOT NULL,
        escalated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        level integer DEFAULT 1 NOT NULL,
        reason text,
        resolved_at timestamp(6) with time zone
    );
  END IF;
END $$;

-- approval_requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_requests') THEN
    CREATE TABLE public.approval_requests (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        requested_by uuid NOT NULL,
        assigned_to uuid NOT NULL,
        approval_type public."ApprovalType" NOT NULL,
        reference_id text NOT NULL,
        status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
        document_number text,
        amount numeric(14,2),
        description text,
        rejection_reason text,
        approved_at timestamp(6) with time zone,
        rejected_at timestamp(6) with time zone,
        required_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- audit_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE TABLE public.audit_logs (
        id uuid NOT NULL,
        user_id uuid,
        action public."AuditAction" NOT NULL,
        entity_type text,
        entity_id text,
        old_values jsonb,
        new_values jsonb,
        ip_address text,
        user_agent text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        company_id uuid,
        device_id text,
        metadata jsonb,
        reason text,
        severity public."AuditSeverity",
        request_id text
    );
  END IF;
END $$;

-- auth_challenges
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_challenges') THEN
    CREATE TABLE public.auth_challenges (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        purpose public."AuthChallengePurpose" NOT NULL,
        token_hash text NOT NULL,
        totp_secret_encrypted text,
        attempt_count integer DEFAULT 0 NOT NULL,
        expires_at timestamp(6) with time zone NOT NULL,
        consumed_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        requested_ip text,
        requested_user_agent text
    );
  END IF;
END $$;

-- backup_artifacts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_artifacts') THEN
    CREATE TABLE public.backup_artifacts (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        backup_job_id uuid,
        file_name text NOT NULL,
        storage_path text NOT NULL,
        file_size bigint NOT NULL,
        sha256 text NOT NULL,
        provider public."BackupProvider" NOT NULL,
        drive_file_id text,
        schema_version integer DEFAULT 1 NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- backup_jobs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_jobs') THEN
    CREATE TABLE public.backup_jobs (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        status public."BackupJobStatus" DEFAULT 'PENDING'::public."BackupJobStatus" NOT NULL,
        provider public."BackupProvider" NOT NULL,
        error_message text,
        started_at timestamp(6) with time zone,
        completed_at timestamp(6) with time zone,
        created_by uuid,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        deleted_at timestamp(6) with time zone,
        deleted_by uuid,
        lifecycle_status public."LifecycleStatus" DEFAULT 'ACTIVE'::public."LifecycleStatus" NOT NULL
    );
  END IF;
END $$;

-- backup_provider_credentials
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_provider_credentials') THEN
    CREATE TABLE public.backup_provider_credentials (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        provider public."BackupProvider" DEFAULT 'GOOGLE_DRIVE'::public."BackupProvider" NOT NULL,
        encrypted_tokens text NOT NULL,
        account_email text,
        drive_folder_id text,
        connected_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- barcode_audit_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barcode_audit_logs') THEN
    CREATE TABLE public.barcode_audit_logs (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        barcode_id uuid,
        barcode text NOT NULL,
        product_id uuid,
        action text NOT NULL,
        detail jsonb,
        user_id uuid NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- barcode_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barcode_history') THEN
    CREATE TABLE public.barcode_history (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        barcode text NOT NULL,
        old_product_id uuid,
        new_product_id uuid,
        user_id uuid NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- barcode_print_jobs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barcode_print_jobs') THEN
    CREATE TABLE public.barcode_print_jobs (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        template_id uuid NOT NULL,
        pdf_url text,
        status text DEFAULT 'PENDING'::text NOT NULL,
        quantities jsonb,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        label_count integer DEFAULT 0 NOT NULL
    );
  END IF;
END $$;

-- barcode_template_versions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barcode_template_versions') THEN
    CREATE TABLE public.barcode_template_versions (
        id uuid NOT NULL,
        template_name text NOT NULL,
        version integer DEFAULT 1 NOT NULL,
        json_content jsonb NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by uuid
    );
  END IF;
END $$;

-- branding_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branding_profiles') THEN
    CREATE TABLE public.branding_profiles (
        id uuid NOT NULL,
        branding_version integer DEFAULT 1 NOT NULL,
        logo_asset_id uuid,
        watermark_asset_id uuid,
        seal_asset_id uuid,
        signature_asset_id uuid,
        letterhead_asset_id uuid,
        footer_text text,
        email text,
        phone text,
        website text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        company_name text,
        gst_number text,
        address text,
        primary_color text,
        secondary_color text,
        accent_color text
    );
  END IF;
END $$;

-- channel_accounts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_accounts') THEN
    CREATE TABLE public.channel_accounts (
        id uuid NOT NULL,
        company_id uuid,
        channel public."ChatChannel" DEFAULT 'WHATSAPP'::public."ChatChannel" NOT NULL,
        provider text DEFAULT 'meta'::text NOT NULL,
        business_account_id text,
        phone_number_id text NOT NULL,
        display_phone text,
        access_token text,
        webhook_secret text,
        status public."ChannelAccountStatus" DEFAULT 'ACTIVE'::public."ChannelAccountStatus" NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- companies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    CREATE TABLE public.companies (
        id uuid NOT NULL,
        company_code text NOT NULL,
        company_name text NOT NULL,
        address text,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        subscription_plan public."SubscriptionPlan" DEFAULT 'TRIAL'::public."SubscriptionPlan" NOT NULL,
        billing_cycle public."BillingCycle",
        subscription_status public."SubscriptionStatus" DEFAULT 'ACTIVE'::public."SubscriptionStatus" NOT NULL,
        trial_starts_at timestamp with time zone,
        trial_ends_at timestamp with time zone,
        subscription_ends_at timestamp with time zone,
        platform_marketing_opt_out boolean DEFAULT false NOT NULL,
        razorpay_subscription_id text,
        paid_activated_at timestamp(6) with time zone,
        branding_profile_id uuid
    );
  END IF;
END $$;

-- company_engagement_snapshots
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_engagement_snapshots') THEN
    CREATE TABLE public.company_engagement_snapshots (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        snapshot_date date NOT NULL,
        lifecycle_stage public."LifecycleStage" NOT NULL,
        last_login_at timestamp(6) with time zone,
        login_count_30d integer DEFAULT 0 NOT NULL,
        features_used jsonb DEFAULT '{}'::jsonb NOT NULL,
        products_count integer DEFAULT 0 NOT NULL,
        inventory_txn_count integer DEFAULT 0 NOT NULL,
        team_members_count integer DEFAULT 0 NOT NULL,
        reports_generated integer DEFAULT 0 NOT NULL,
        trial_progress_pct integer DEFAULT 0 NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- company_health_score_configs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_health_score_configs') THEN
    CREATE TABLE public.company_health_score_configs (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        company_id uuid NOT NULL,
        config jsonb DEFAULT '{"weights": {}, "schemaVersion": 1}'::jsonb NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- company_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings') THEN
    CREATE TABLE public.company_settings (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        key text NOT NULL,
        value text NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- contract_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_header') THEN
    CREATE TABLE public.contract_header (
        id uuid NOT NULL,
        contract_number text NOT NULL,
        shop_id uuid NOT NULL,
        supplier_id uuid NOT NULL,
        rfq_id uuid,
        quotation_id uuid,
        title text NOT NULL,
        payment_terms text,
        start_date date NOT NULL,
        end_date date,
        notes text,
        status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
        posted_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- contract_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_items') THEN
    CREATE TABLE public.contract_items (
        id uuid NOT NULL,
        contract_id uuid NOT NULL,
        product_id uuid,
        description text,
        quantity numeric(12,3) NOT NULL,
        uom text NOT NULL,
        unit_price numeric(12,2) NOT NULL,
        line_value numeric(14,2) NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- conversations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    CREATE TABLE public.conversations (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        user_channel_link_id uuid NOT NULL,
        status public."ConversationStatus" DEFAULT 'ACTIVE'::public."ConversationStatus" NOT NULL,
        summary text,
        last_message_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- cost_layers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_layers') THEN
    CREATE TABLE public.cost_layers (
        id uuid NOT NULL,
        shop_id uuid NOT NULL,
        product_id uuid NOT NULL,
        gr_id uuid,
        ledger_id uuid,
        qty_remaining numeric(12,3) NOT NULL,
        qty_original numeric(12,3) NOT NULL,
        unit_cost numeric(14,4) NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- credit_notes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_notes') THEN
    CREATE TABLE public.credit_notes (
        id uuid NOT NULL,
        credit_number text NOT NULL,
        credit_date date NOT NULL,
        shop_id uuid NOT NULL,
        customer_id uuid NOT NULL,
        invoice_id uuid,
        return_id uuid,
        status public."CreditNoteStatus" DEFAULT 'DRAFT'::public."CreditNoteStatus" NOT NULL,
        amount numeric(14,2) NOT NULL,
        applied_amount numeric(14,2) DEFAULT 0 NOT NULL,
        remarks text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- currencies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'currencies') THEN
    CREATE TABLE public.currencies (
        code text NOT NULL,
        name text NOT NULL,
        decimals integer DEFAULT 2 NOT NULL
    );
  END IF;
END $$;

-- customer_return_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_return_items') THEN
    CREATE TABLE public.customer_return_items (
        id uuid NOT NULL,
        return_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL,
        uom text NOT NULL,
        unit_price numeric(12,2) NOT NULL,
        line_value numeric(14,2) NOT NULL
    );
  END IF;
END $$;

-- customer_returns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_returns') THEN
    CREATE TABLE public.customer_returns (
        id uuid NOT NULL,
        return_number text NOT NULL,
        return_date date NOT NULL,
        shop_id uuid NOT NULL,
        customer_id uuid NOT NULL,
        invoice_id uuid,
        sales_order_id uuid,
        reason text,
        remarks text,
        status public."ReturnStatus" DEFAULT 'DRAFT'::public."ReturnStatus" NOT NULL,
        total_value numeric(14,2) DEFAULT 0 NOT NULL,
        posted_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- customers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    CREATE TABLE public.customers (
        id uuid NOT NULL,
        customer_code text NOT NULL,
        customer_name text NOT NULL,
        email text,
        phone text,
        tax_id text,
        pan text,
        street text,
        city text,
        state text,
        postal_code text,
        country text,
        shop_id uuid NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- damaged_stock
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'damaged_stock') THEN
    CREATE TABLE public.damaged_stock (
        id uuid NOT NULL,
        damage_number text NOT NULL,
        damage_date date NOT NULL,
        shop_id uuid NOT NULL,
        product_id uuid NOT NULL,
        damaged_quantity numeric(12,3) NOT NULL,
        reason text NOT NULL,
        remarks text,
        status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
        posted_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- data_retention_config
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_retention_config') THEN
    CREATE TABLE public.data_retention_config (
        id uuid NOT NULL,
        entity text NOT NULL,
        retain_days integer NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- device_registrations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_registrations') THEN
    CREATE TABLE public.device_registrations (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        company_id uuid NOT NULL,
        device_id text NOT NULL,
        device_name text,
        platform public."DevicePlatform" NOT NULL,
        push_token text,
        app_version text,
        os_version text,
        is_active boolean DEFAULT true NOT NULL,
        last_active_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- document_branding
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_branding') THEN
    CREATE TABLE public.document_branding (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        company_id uuid NOT NULL,
        document_type text NOT NULL,
        settings jsonb NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- document_email_outbox
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_email_outbox') THEN
    CREATE TABLE public.document_email_outbox (
        id uuid NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid NOT NULL,
        document_number text NOT NULL,
        template_id text NOT NULL,
        company_id uuid NOT NULL,
        shop_id uuid,
        recipient text NOT NULL,
        attachment_filename text,
        status public."DocumentEmailStatus" DEFAULT 'PENDING_PDF'::public."DocumentEmailStatus" NOT NULL,
        trigger public."DocumentEmailTrigger" DEFAULT 'MANUAL'::public."DocumentEmailTrigger" NOT NULL,
        attempts integer DEFAULT 0 NOT NULL,
        retry_count integer DEFAULT 0 NOT NULL,
        last_error text,
        next_retry_at timestamp(6) with time zone,
        payload_json jsonb NOT NULL,
        sent_at timestamp(6) with time zone,
        sent_by_id uuid,
        message_id text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- document_registry
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_registry') THEN
    CREATE TABLE public.document_registry (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        document_type character varying(50) NOT NULL,
        reference_id uuid,
        template_version character varying(20) DEFAULT '1.0'::character varying NOT NULL,
        storage_key character varying(500) NOT NULL,
        storage_provider character varying(50) DEFAULT 'local'::character varying NOT NULL,
        file_size_bytes bigint,
        checksum character varying(64),
        job_id character varying(100),
        status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
        generated_by uuid,
        generated_at timestamp with time zone DEFAULT now(),
        expires_at timestamp with time zone,
        download_count integer DEFAULT 0,
        last_downloaded_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        metadata jsonb,
        mime_type character varying(100) DEFAULT 'application/pdf'::character varying NOT NULL,
        render_duration_ms integer,
        rendered_at timestamp with time zone,
        storage_latency_ms integer
    );
  END IF;
END $$;

-- document_sequences
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_sequences') THEN
    CREATE TABLE public.document_sequences (
        id uuid NOT NULL,
        doc_type text NOT NULL,
        shop_id uuid NOT NULL,
        year_month text NOT NULL,
        last_seq integer NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- document_series_config
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_series_config') THEN
    CREATE TABLE public.document_series_config (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        shop_id uuid,
        doc_type text NOT NULL,
        module_label text NOT NULL,
        prefix text NOT NULL,
        starting_number integer DEFAULT 1 NOT NULL,
        pad_width integer DEFAULT 5 NOT NULL,
        restart_period public."DocumentSeriesRestart" DEFAULT 'NONE'::public."DocumentSeriesRestart" NOT NULL,
        shop_scoped boolean DEFAULT false NOT NULL,
        enabled boolean DEFAULT true NOT NULL,
        use_category_prefix boolean DEFAULT true NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- email_delivery_log
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_delivery_log') THEN
    CREATE TABLE public.email_delivery_log (
        id uuid NOT NULL,
        template_id text NOT NULL,
        entity_type text NOT NULL,
        entity_id text NOT NULL,
        recipient text NOT NULL,
        sent_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        click_count integer DEFAULT 0 NOT NULL,
        open_count integer DEFAULT 0 NOT NULL
    );
  END IF;
END $$;

-- email_sender_domains
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sender_domains') THEN
    CREATE TABLE public.email_sender_domains (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        domain text NOT NULL,
        dkim_selector text NOT NULL,
        dkim_host text NOT NULL,
        dkim_value text NOT NULL,
        status public."EmailSenderStatus" DEFAULT 'PENDING'::public."EmailSenderStatus" NOT NULL,
        verified_at timestamp(6) with time zone,
        last_checked_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- email_sender_identities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sender_identities') THEN
    CREATE TABLE public.email_sender_identities (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        domain_id uuid,
        display_name text NOT NULL,
        email text NOT NULL,
        sender_type public."EmailSenderType" NOT NULL,
        is_primary boolean DEFAULT false NOT NULL,
        status public."EmailSenderStatus" DEFAULT 'PENDING'::public."EmailSenderStatus" NOT NULL,
        verified_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        smtp_host text,
        smtp_port integer,
        smtp_secure boolean,
        smtp_user text,
        smtp_password_enc text,
        smtp_configured_at timestamp(6) with time zone,
        smtp_last_verified_at timestamp(6) with time zone
    );
  END IF;
END $$;

-- email_sender_verifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sender_verifications') THEN
    CREATE TABLE public.email_sender_verifications (
        id uuid NOT NULL,
        sender_id uuid NOT NULL,
        otp_hash text NOT NULL,
        attempt_count integer DEFAULT 0 NOT NULL,
        expires_at timestamp(6) with time zone NOT NULL,
        consumed_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- eway_bill_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eway_bill_items') THEN
    CREATE TABLE public.eway_bill_items (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        eway_bill_id uuid NOT NULL,
        product_id uuid,
        product_name text NOT NULL,
        description text,
        hsn_code text NOT NULL,
        quantity numeric(14,3) NOT NULL,
        unit text DEFAULT 'PCS'::text NOT NULL,
        taxable_amount numeric(14,2) NOT NULL,
        gst_rate numeric(5,2) NOT NULL,
        cgst numeric(14,2) DEFAULT 0 NOT NULL,
        sgst numeric(14,2) DEFAULT 0 NOT NULL,
        igst numeric(14,2) DEFAULT 0 NOT NULL,
        cess numeric(14,2) DEFAULT 0 NOT NULL,
        total numeric(14,2) NOT NULL
    );
  END IF;
END $$;

-- eway_bills
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eway_bills') THEN
    CREATE TABLE public.eway_bills (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        eway_bill_number text NOT NULL,
        shop_id uuid NOT NULL,
        invoice_id uuid,
        sales_order_id uuid,
        customer_id uuid,
        status public."EwayBillStatus" DEFAULT 'DRAFT'::public."EwayBillStatus" NOT NULL,
        supply_type public."EwaySupplyType" DEFAULT 'OUTWARD'::public."EwaySupplyType" NOT NULL,
        sub_type public."EwaySubType" DEFAULT 'SUPPLY'::public."EwaySubType" NOT NULL,
        transaction_type public."EwayTransactionType" DEFAULT 'REGULAR'::public."EwayTransactionType" NOT NULL,
        document_type public."EwayDocumentType" DEFAULT 'TAX_INVOICE'::public."EwayDocumentType" NOT NULL,
        document_number text NOT NULL,
        document_date date NOT NULL,
        from_gstin text,
        from_name text NOT NULL,
        from_address1 text,
        from_address2 text,
        from_place text,
        from_pincode text,
        from_state_code text,
        to_gstin text,
        to_name text NOT NULL,
        to_address1 text,
        to_address2 text,
        to_place text,
        to_pincode text,
        to_state_code text,
        transporter_gstin text,
        transporter_name text,
        transporter_id text,
        transport_mode public."EwayTransportMode" DEFAULT 'ROAD'::public."EwayTransportMode" NOT NULL,
        trans_doc_number text,
        trans_doc_date date,
        vehicle_number text,
        vehicle_type public."EwayVehicleType" DEFAULT 'REGULAR'::public."EwayVehicleType" NOT NULL,
        distance_km integer,
        taxable_value numeric(14,2) DEFAULT 0 NOT NULL,
        cgst_value numeric(14,2) DEFAULT 0 NOT NULL,
        sgst_value numeric(14,2) DEFAULT 0 NOT NULL,
        igst_value numeric(14,2) DEFAULT 0 NOT NULL,
        cess_value numeric(14,2) DEFAULT 0 NOT NULL,
        total_value numeric(14,2) DEFAULT 0 NOT NULL,
        valid_upto timestamp(6) without time zone,
        generated_at timestamp(6) without time zone,
        cancelled_at timestamp(6) without time zone,
        cancel_reason text,
        remarks text,
        created_at timestamp(6) without time zone DEFAULT now() NOT NULL,
        updated_at timestamp(6) without time zone DEFAULT now() NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- fx_rates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fx_rates') THEN
    CREATE TABLE public.fx_rates (
        id uuid NOT NULL,
        base text NOT NULL,
        quote text NOT NULL,
        rate numeric(18,8) NOT NULL,
        as_of timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- goods_issue_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goods_issue_header') THEN
    CREATE TABLE public.goods_issue_header (
        id uuid NOT NULL,
        gi_number text NOT NULL,
        gi_date date NOT NULL,
        shop_id uuid NOT NULL,
        issue_reason text NOT NULL,
        remarks text,
        status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
        posted_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL,
        issue_type text NOT NULL,
        other_reason text,
        tenant_id uuid NOT NULL,
        reversed_by uuid
    );
  END IF;
END $$;

-- goods_issue_item_lots
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goods_issue_item_lots') THEN
    CREATE TABLE public.goods_issue_item_lots (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        gi_item_id uuid NOT NULL,
        lot_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL
    );
  END IF;
END $$;

-- goods_issue_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goods_issue_items') THEN
    CREATE TABLE public.goods_issue_items (
        id uuid NOT NULL,
        gi_header_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL,
        uom text NOT NULL,
        available_stock_snapshot numeric(12,3) NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        tenant_id uuid NOT NULL,
        so_line_id uuid
    );
  END IF;
END $$;

-- goods_receipt_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goods_receipt_header') THEN
    CREATE TABLE public.goods_receipt_header (
        id uuid NOT NULL,
        gr_number text NOT NULL,
        gr_date date NOT NULL,
        shop_id uuid NOT NULL,
        supplier_name text NOT NULL,
        supplier_ref text,
        remarks text,
        status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
        posted_at timestamp(6) with time zone,
        total_value numeric(14,2),
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        purchase_order_id uuid,
        branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL,
        receipt_type public."ReceiptType" DEFAULT 'FULL'::public."ReceiptType" NOT NULL,
        receipt_source public."ReceiptSource" DEFAULT 'PURCHASE_ORDER'::public."ReceiptSource" NOT NULL,
        inward_shift public."InwardShift",
        tenant_id uuid NOT NULL,
        reversed_by uuid
    );
  END IF;
END $$;

-- goods_receipt_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goods_receipt_items') THEN
    CREATE TABLE public.goods_receipt_items (
        id uuid NOT NULL,
        gr_header_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL,
        uom text NOT NULL,
        purchase_rate numeric(12,2) NOT NULL,
        line_value numeric(14,2) NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        batch_number text,
        serial_number text,
        expiry_date date,
        storage_location_id uuid,
        tenant_id uuid NOT NULL,
        lot_id uuid
    );
  END IF;
END $$;

-- idempotency_keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'idempotency_keys') THEN
    CREATE TABLE public.idempotency_keys (
        id uuid NOT NULL,
        key text NOT NULL,
        scope text,
        result jsonb NOT NULL,
        user_id uuid,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at timestamp(6) with time zone
    );
  END IF;
END $$;

-- inventory_exceptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_exceptions') THEN
    CREATE TABLE public.inventory_exceptions (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        company_id uuid NOT NULL,
        type text NOT NULL,
        severity text NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid NOT NULL,
        title text NOT NULL,
        description text,
        status text DEFAULT 'OPEN'::text NOT NULL,
        metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
        first_detected_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        last_detected_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        acknowledged_at timestamp(6) with time zone,
        acknowledged_by uuid,
        resolved_at timestamp(6) with time zone,
        resolved_by uuid,
        resolution_type text,
        resolution_notes text
    );
  END IF;
END $$;

-- inventory_lot_alerts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_lot_alerts') THEN
    CREATE TABLE public.inventory_lot_alerts (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        lot_id uuid NOT NULL,
        threshold integer NOT NULL,
        event_id uuid NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- inventory_lots
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_lots') THEN
    CREATE TABLE public.inventory_lots (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        company_id uuid NOT NULL,
        shop_id uuid NOT NULL,
        product_id uuid NOT NULL,
        lot_number text NOT NULL,
        expiry_date date,
        qty_received numeric(12,3) DEFAULT 0 NOT NULL,
        qty_on_hand numeric(12,3) DEFAULT 0 NOT NULL,
        unit_cost numeric(14,4),
        status public."InventoryLotStatus" DEFAULT 'ACTIVE'::public."InventoryLotStatus" NOT NULL,
        storage_location_id uuid,
        gr_item_id uuid,
        blocked_at timestamp(6) with time zone,
        blocked_reason text,
        scrapped_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by uuid,
        updated_by uuid,
        tenant_id uuid NOT NULL,
        CONSTRAINT chk_lot_qty_on_hand_non_negative CHECK ((qty_on_hand >= (0)::numeric))
    );
  END IF;
END $$;

-- invoice_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_header') THEN
    CREATE TABLE public.invoice_header (
        id uuid NOT NULL,
        invoice_number text NOT NULL,
        invoice_date date NOT NULL,
        sales_order_id uuid,
        customer_id uuid NOT NULL,
        shop_id uuid NOT NULL,
        status public."InvoiceStatus" DEFAULT 'DRAFT'::public."InvoiceStatus" NOT NULL,
        branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL,
        currency text DEFAULT 'USD'::text NOT NULL,
        fx_rate_used numeric(18,8),
        discount_amount numeric(14,2) DEFAULT 0 NOT NULL,
        tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
        total_value numeric(14,2) NOT NULL,
        paid_value numeric(14,2) DEFAULT 0 NOT NULL,
        due_date date,
        remarks text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- job_failures
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_failures') THEN
    CREATE TABLE public.job_failures (
        id uuid NOT NULL,
        queue text NOT NULL,
        job_name text NOT NULL,
        job_id text,
        data jsonb,
        error_name text,
        error_message text,
        stack text,
        attempts integer DEFAULT 0 NOT NULL,
        failed_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- lifecycle_campaign_enrollments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lifecycle_campaign_enrollments') THEN
    CREATE TABLE public.lifecycle_campaign_enrollments (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        campaign_key text NOT NULL,
        scheduled_for timestamp(6) with time zone,
        sent_at timestamp(6) with time zone,
        status public."LifecycleCampaignStatus" DEFAULT 'SCHEDULED'::public."LifecycleCampaignStatus" NOT NULL,
        email_delivery_log_id uuid,
        metadata jsonb,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- media_assets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_assets') THEN
    CREATE TABLE public.media_assets (
        id uuid NOT NULL,
        company_id uuid,
        shop_id uuid,
        branding_profile_id uuid,
        type public."MediaAssetType" NOT NULL,
        asset_key text NOT NULL,
        file_name text NOT NULL,
        version integer DEFAULT 1 NOT NULL,
        metadata jsonb,
        uploaded_by uuid,
        uploaded_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        active boolean DEFAULT true NOT NULL
    );
  END IF;
END $$;

-- messages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    CREATE TABLE public.messages (
        id uuid NOT NULL,
        conversation_id uuid NOT NULL,
        direction public."MessageDirection" NOT NULL,
        wa_message_id text,
        type text DEFAULT 'text'::text NOT NULL,
        body text,
        payload jsonb,
        status public."ChatMessageStatus" DEFAULT 'RECEIVED'::public."ChatMessageStatus" NOT NULL,
        error text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- notification_audit_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_audit_logs') THEN
    CREATE TABLE public.notification_audit_logs (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        user_id uuid NOT NULL,
        action text NOT NULL,
        notification_id uuid,
        approval_id uuid,
        details jsonb,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- notification_deliveries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_deliveries') THEN
    CREATE TABLE public.notification_deliveries (
        id uuid NOT NULL,
        event_id uuid NOT NULL,
        notification_id uuid,
        company_id uuid NOT NULL,
        recipient_user_id uuid NOT NULL,
        channel public."DeliveryChannel" NOT NULL,
        attempt integer DEFAULT 1 NOT NULL,
        state public."DeliveryState" DEFAULT 'CREATED'::public."DeliveryState" NOT NULL,
        classification public."EventClassification" NOT NULL,
        provider_message_id text,
        latency_ms integer,
        sla_seconds integer,
        correlation_id uuid NOT NULL,
        error text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- notification_preferences
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
    CREATE TABLE public.notification_preferences (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        company_id uuid NOT NULL,
        gr_created boolean DEFAULT true NOT NULL,
        gr_approved boolean DEFAULT true NOT NULL,
        gr_rejected boolean DEFAULT true NOT NULL,
        po_approval_required boolean DEFAULT true NOT NULL,
        po_approved boolean DEFAULT true NOT NULL,
        po_rejected boolean DEFAULT true NOT NULL,
        low_stock_alert boolean DEFAULT true NOT NULL,
        transfer_completed boolean DEFAULT true NOT NULL,
        inventory_adjustment boolean DEFAULT true NOT NULL,
        login_alert boolean DEFAULT true NOT NULL,
        device_alert boolean DEFAULT true NOT NULL,
        push_enabled boolean DEFAULT true NOT NULL,
        email_enabled boolean DEFAULT false NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        whatsapp_enabled boolean DEFAULT false NOT NULL
    );
  END IF;
END $$;

-- notification_rules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_rules') THEN
    CREATE TABLE public.notification_rules (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        event_type text NOT NULL,
        recipient_roles text[],
        channels public."DeliveryChannel"[],
        priority public."NotificationPriority" DEFAULT 'NORMAL'::public."NotificationPriority" NOT NULL,
        sla_seconds integer NOT NULL,
        enabled boolean DEFAULT true NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- notification_templates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_templates') THEN
    CREATE TABLE public.notification_templates (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        event_type text NOT NULL,
        channel public."DeliveryChannel" NOT NULL,
        title text,
        body text,
        email_subject text,
        email_body text,
        wa_template_name text,
        wa_language text,
        enabled boolean DEFAULT true NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- notifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE TABLE public.notifications (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        company_id uuid NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        type public."AlertType" NOT NULL,
        priority public."NotificationPriority" DEFAULT 'NORMAL'::public."NotificationPriority" NOT NULL,
        module public."NotificationModule" NOT NULL,
        status public."NotificationStatus" DEFAULT 'UNREAD'::public."NotificationStatus" NOT NULL,
        reference_type text,
        reference_id text,
        deep_link text,
        action_url text,
        is_read boolean DEFAULT false NOT NULL,
        read_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at timestamp(6) with time zone,
        created_by uuid
    );
  END IF;
END $$;

-- outbox_events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outbox_events') THEN
    CREATE TABLE public.outbox_events (
        id uuid NOT NULL,
        event_id uuid NOT NULL,
        event_type text NOT NULL,
        event_version integer NOT NULL,
        aggregate_type text NOT NULL,
        aggregate_id text NOT NULL,
        company_id uuid NOT NULL,
        classification public."EventClassification" NOT NULL,
        payload jsonb NOT NULL,
        correlation_id uuid NOT NULL,
        causation_id uuid,
        trace_id text,
        span_id text,
        actor_id uuid,
        status public."OutboxStatus" DEFAULT 'PENDING'::public."OutboxStatus" NOT NULL,
        retry_count integer DEFAULT 0 NOT NULL,
        last_error text,
        next_attempt_at timestamp(6) with time zone,
        published_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- password_reset_requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_requests') THEN
    CREATE TABLE public.password_reset_requests (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        email text NOT NULL,
        method public."PasswordResetMethod" NOT NULL,
        otp_hash text,
        link_token_hash text,
        attempt_count integer DEFAULT 0 NOT NULL,
        expires_at timestamp(6) with time zone NOT NULL,
        consumed_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        last_sent_at timestamp(6) with time zone,
        requested_ip text,
        requested_user_agent text
    );
  END IF;
END $$;

-- payment_receipts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_receipts') THEN
    CREATE TABLE public.payment_receipts (
        id uuid NOT NULL,
        receipt_number text NOT NULL,
        receipt_date date NOT NULL,
        invoice_id uuid NOT NULL,
        shop_id uuid NOT NULL,
        amount numeric(14,2) NOT NULL,
        currency text DEFAULT 'USD'::text NOT NULL,
        fx_rate_used numeric(18,8),
        method text,
        reference text,
        remarks text,
        branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- pdf_jobs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_jobs') THEN
    CREATE TABLE public.pdf_jobs (
        id character varying(100) NOT NULL,
        tenant_id uuid NOT NULL,
        document_id uuid,
        job_type character varying(50),
        status character varying(50),
        progress integer DEFAULT 0,
        result jsonb,
        error_message text,
        created_at timestamp with time zone DEFAULT now(),
        completed_at timestamp with time zone
    );
  END IF;
END $$;

-- platform_audit_log
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_audit_log') THEN
    CREATE TABLE public.platform_audit_log (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        action public."AuditAction" NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid NOT NULL,
        old_values jsonb,
        new_values jsonb,
        ip_address text,
        user_agent text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- platform_notification_reads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_notification_reads') THEN
    CREATE TABLE public.platform_notification_reads (
        id uuid NOT NULL,
        notification_id uuid NOT NULL,
        admin_email text NOT NULL,
        read_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- platform_notifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_notifications') THEN
    CREATE TABLE public.platform_notifications (
        id uuid NOT NULL,
        category public."PlatformNotificationCategory" NOT NULL,
        severity public."PlatformNotificationSeverity" DEFAULT 'INFO'::public."PlatformNotificationSeverity" NOT NULL,
        notification_key text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        action_url text,
        reference_type text,
        reference_id uuid,
        company_id uuid,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at timestamp(6) with time zone
    );
  END IF;
END $$;

-- po_cancel_verifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'po_cancel_verifications') THEN
    CREATE TABLE public.po_cancel_verifications (
        id uuid NOT NULL,
        po_id uuid NOT NULL,
        user_id uuid NOT NULL,
        reason text NOT NULL,
        otp_hash text NOT NULL,
        attempt_count integer DEFAULT 0 NOT NULL,
        expires_at timestamp(6) with time zone NOT NULL,
        consumed_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- product_barcodes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_barcodes') THEN
    CREATE TABLE public.product_barcodes (
        id uuid NOT NULL,
        product_id uuid NOT NULL,
        company_id uuid,
        barcode text NOT NULL,
        barcode_type public."BarcodeType" DEFAULT 'INTERNAL'::public."BarcodeType" NOT NULL,
        is_primary boolean DEFAULT false NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        supplier_id uuid,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- product_plants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_plants') THEN
    CREATE TABLE public.product_plants (
        id uuid NOT NULL,
        product_id uuid NOT NULL,
        shop_id uuid NOT NULL,
        storage_location_id uuid,
        opening_stock numeric(12,3) DEFAULT 0 NOT NULL,
        min_stock_level numeric(12,3) DEFAULT 0 NOT NULL,
        max_stock_level numeric(12,3),
        reorder_qty numeric(12,3),
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        batch_number text,
        expiry_date date
    );
  END IF;
END $$;

-- product_specifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_specifications') THEN
    CREATE TABLE public.product_specifications (
        id uuid NOT NULL,
        product_id uuid NOT NULL,
        label text NOT NULL,
        value text NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- products
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    CREATE TABLE public.products (
        id uuid NOT NULL,
        product_code text NOT NULL,
        description text NOT NULL,
        uom text NOT NULL,
        category text NOT NULL,
        purchase_price numeric(12,2) NOT NULL,
        selling_price numeric(12,2) NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        material_group text,
        drawing_reference text,
        hsn_code text,
        brand text,
        tax_preference public."TaxPreference" DEFAULT 'TAXABLE'::public."TaxPreference" NOT NULL,
        gst_rate numeric(7,4) DEFAULT 0 NOT NULL,
        image_url text,
        thumbnail_url text,
        shelf_life_days integer,
        expiry_tracking public."ExpiryTracking" DEFAULT 'OPTIONAL'::public."ExpiryTracking" NOT NULL,
        tenant_id uuid NOT NULL
    );
  END IF;
END $$;

-- purchase_order_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_header') THEN
    CREATE TABLE public.purchase_order_header (
        id uuid NOT NULL,
        po_number text NOT NULL,
        po_date date NOT NULL,
        shop_id uuid NOT NULL,
        supplier text NOT NULL,
        status public."PurchaseOrderStatus" DEFAULT 'DRAFT'::public."PurchaseOrderStatus" NOT NULL,
        remarks text,
        total_value numeric(14,2),
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        contract_id uuid,
        currency text DEFAULT 'USD'::text NOT NULL,
        fx_rate_used numeric(18,8),
        discount_amount numeric(14,2) DEFAULT 0 NOT NULL,
        tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
        rfq_id uuid,
        branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL,
        tenant_id uuid NOT NULL
    );
  END IF;
END $$;

-- purchase_order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_items') THEN
    CREATE TABLE public.purchase_order_items (
        id uuid NOT NULL,
        po_header_id uuid NOT NULL,
        product_id uuid NOT NULL,
        current_stock numeric(12,3) NOT NULL,
        min_stock numeric(12,3) NOT NULL,
        suggested_qty numeric(12,3) NOT NULL,
        order_qty numeric(12,3) NOT NULL,
        rate numeric(12,2) NOT NULL,
        line_value numeric(14,2) NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        discount_amount numeric(14,2) DEFAULT 0 NOT NULL,
        tax_rate numeric(7,4) DEFAULT 0 NOT NULL,
        tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
        rfq_item_id uuid,
        line_description text,
        line_category text,
        tenant_id uuid NOT NULL
    );
  END IF;
END $$;

-- report_saved_filters
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_saved_filters') THEN
    CREATE TABLE public.report_saved_filters (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        report_type text NOT NULL,
        name text NOT NULL,
        filter_json jsonb NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- restore_jobs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restore_jobs') THEN
    CREATE TABLE public.restore_jobs (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        artifact_id uuid NOT NULL,
        mode public."RestoreMode" DEFAULT 'TENANT_REPLACE'::public."RestoreMode" NOT NULL,
        status public."RestoreJobStatus" DEFAULT 'PENDING'::public."RestoreJobStatus" NOT NULL,
        dry_run_report jsonb,
        confirmation_token text,
        error_message text,
        started_at timestamp(6) with time zone,
        completed_at timestamp(6) with time zone,
        created_by uuid,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- rfq_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rfq_header') THEN
    CREATE TABLE public.rfq_header (
        id uuid NOT NULL,
        rfq_number text NOT NULL,
        rfq_date date NOT NULL,
        deadline date,
        title text NOT NULL,
        notes text,
        shop_id uuid NOT NULL,
        branding_mode public."BrandingMode" DEFAULT 'LIVE'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL,
        status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
        posted_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- rfq_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rfq_items') THEN
    CREATE TABLE public.rfq_items (
        id uuid NOT NULL,
        rfq_header_id uuid NOT NULL,
        product_id uuid,
        description text,
        quantity numeric(12,3) NOT NULL,
        uom text NOT NULL,
        specifications text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- rfq_suppliers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rfq_suppliers') THEN
    CREATE TABLE public.rfq_suppliers (
        id uuid NOT NULL,
        rfq_id uuid NOT NULL,
        supplier_id uuid NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    CREATE TABLE public.roles (
        id uuid NOT NULL,
        name public."RoleName" NOT NULL,
        permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- sales_order_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_order_header') THEN
    CREATE TABLE public.sales_order_header (
        id uuid NOT NULL,
        so_number text NOT NULL,
        order_date date NOT NULL,
        expected_date date,
        customer_id uuid NOT NULL,
        shop_id uuid NOT NULL,
        status public."SalesOrderStatus" DEFAULT 'DRAFT'::public."SalesOrderStatus" NOT NULL,
        fulfillment_status public."FulfillmentStatus" DEFAULT 'NONE'::public."FulfillmentStatus" NOT NULL,
        remarks text,
        currency text DEFAULT 'USD'::text NOT NULL,
        fx_rate_used numeric(18,8),
        discount_amount numeric(14,2) DEFAULT 0 NOT NULL,
        tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
        total_value numeric(14,2),
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL,
        gst_supply_type public."GstSupplyType" DEFAULT 'INTRA_STATE'::public."GstSupplyType" NOT NULL,
        subtotal_before_tax numeric(14,2) DEFAULT 0 NOT NULL,
        total_cgst numeric(14,2) DEFAULT 0 NOT NULL,
        total_sgst numeric(14,2) DEFAULT 0 NOT NULL,
        total_igst numeric(14,2) DEFAULT 0 NOT NULL,
        tenant_id uuid NOT NULL
    );
  END IF;
END $$;

-- sales_order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_order_items') THEN
    CREATE TABLE public.sales_order_items (
        id uuid NOT NULL,
        so_header_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL,
        shipped_qty numeric(12,3) DEFAULT 0 NOT NULL,
        uom text NOT NULL,
        unit_price numeric(12,2) NOT NULL,
        discount_amount numeric(14,2) DEFAULT 0 NOT NULL,
        tax_rate numeric(7,4) DEFAULT 0 NOT NULL,
        tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
        line_value numeric(14,2) NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        cgst_rate numeric(7,4) DEFAULT 0 NOT NULL,
        sgst_rate numeric(7,4) DEFAULT 0 NOT NULL,
        igst_rate numeric(7,4) DEFAULT 0 NOT NULL,
        tenant_id uuid NOT NULL
    );
  END IF;
END $$;

-- sales_quote_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_quote_header') THEN
    CREATE TABLE public.sales_quote_header (
        id uuid NOT NULL,
        quote_number text NOT NULL,
        quote_date date NOT NULL,
        valid_until date,
        customer_id uuid NOT NULL,
        shop_id uuid NOT NULL,
        status public."SalesQuotationStatus" DEFAULT 'DRAFT'::public."SalesQuotationStatus" NOT NULL,
        branding_mode public."BrandingMode" DEFAULT 'LIVE'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL,
        sales_order_id uuid,
        portal_token text,
        remarks text,
        total_value numeric(14,2),
        customer_requested_total numeric(14,2),
        customer_request_note text,
        customer_responded_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- sales_quote_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_quote_items') THEN
    CREATE TABLE public.sales_quote_items (
        id uuid NOT NULL,
        quote_header_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL,
        uom text NOT NULL,
        unit_price numeric(12,2) NOT NULL,
        line_value numeric(14,2) NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- scan_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_logs') THEN
    CREATE TABLE public.scan_logs (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        shop_id uuid,
        barcode text NOT NULL,
        product_id uuid,
        user_id uuid NOT NULL,
        action public."ScanAction" DEFAULT 'LOOKUP'::public."ScanAction" NOT NULL,
        result public."ScanResult" DEFAULT 'FOUND'::public."ScanResult" NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        source public."ScanSource" DEFAULT 'API'::public."ScanSource" NOT NULL,
        session_id uuid
    );
  END IF;
END $$;

-- sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
    CREATE TABLE public.sessions (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        refresh_hash text NOT NULL,
        ip text,
        user_agent text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        last_seen_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        revoked_at timestamp(6) with time zone,
        expires_at timestamp(6) with time zone,
        device_name text
    );
  END IF;
END $$;

-- shops
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shops') THEN
    CREATE TABLE public.shops (
        id uuid NOT NULL,
        shop_number text NOT NULL,
        shop_name text NOT NULL,
        address text NOT NULL,
        contact_person text NOT NULL,
        mobile text NOT NULL,
        email text NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        costing_method public."CostingMethod" DEFAULT 'AVERAGE'::public."CostingMethod" NOT NULL,
        functional_currency text DEFAULT 'USD'::text NOT NULL,
        branding_profile_id uuid,
        tax_id text,
        company_id uuid
    );
  END IF;
END $$;

-- signup_verifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signup_verifications') THEN
    CREATE TABLE public.signup_verifications (
        id uuid NOT NULL,
        email text NOT NULL,
        payload jsonb NOT NULL,
        otp_hash text NOT NULL,
        attempt_count integer DEFAULT 0 NOT NULL,
        expires_at timestamp(6) with time zone NOT NULL,
        consumed_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        session_token_hash text,
        totp_secret_encrypted text,
        phone text,
        phone_otp_hash text
    );
  END IF;
END $$;

-- stock_count_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_count_items') THEN
    CREATE TABLE public.stock_count_items (
        id uuid NOT NULL,
        session_id uuid NOT NULL,
        product_id uuid NOT NULL,
        counted_qty numeric(12,3) DEFAULT 0 NOT NULL,
        expected_qty numeric(12,3),
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- stock_count_sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_count_sessions') THEN
    CREATE TABLE public.stock_count_sessions (
        id uuid NOT NULL,
        session_number text NOT NULL,
        company_id uuid NOT NULL,
        shop_id uuid NOT NULL,
        status public."StockCountStatus" DEFAULT 'OPEN'::public."StockCountStatus" NOT NULL,
        remarks text,
        started_by uuid NOT NULL,
        approved_by uuid,
        approved_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- stock_ledger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_ledger') THEN
    CREATE TABLE public.stock_ledger (
        id uuid NOT NULL,
        transaction_type public."TransactionType" NOT NULL,
        transaction_ref text NOT NULL,
        transaction_date date NOT NULL,
        shop_id uuid NOT NULL,
        product_id uuid NOT NULL,
        in_qty numeric(12,3) DEFAULT 0 NOT NULL,
        out_qty numeric(12,3) DEFAULT 0 NOT NULL,
        balance_qty numeric(12,3) NOT NULL,
        unit_rate numeric(12,2),
        value numeric(14,2),
        remarks text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        idempotency_key text,
        tenant_id uuid NOT NULL
    );
  END IF;
END $$;

-- stock_reservations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_reservations') THEN
    CREATE TABLE public.stock_reservations (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        tenant_id uuid NOT NULL,
        shop_id uuid NOT NULL,
        product_id uuid NOT NULL,
        source_type text NOT NULL,
        source_id uuid NOT NULL,
        source_line_id uuid NOT NULL,
        qty_reserved numeric(12,3) NOT NULL,
        status text DEFAULT 'ACTIVE'::text NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT stock_reservations_qty_reserved_check CHECK ((qty_reserved > (0)::numeric))
    );
  END IF;
END $$;

-- stock_summary
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_summary') THEN
    CREATE TABLE public.stock_summary (
        id uuid NOT NULL,
        shop_id uuid NOT NULL,
        product_id uuid NOT NULL,
        current_stock numeric(12,3) NOT NULL,
        last_movement_at timestamp(6) with time zone NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        avg_cost numeric(14,4) DEFAULT 0 NOT NULL,
        tenant_id uuid NOT NULL,
        reserved_qty numeric(12,3) DEFAULT 0 NOT NULL
    );
  END IF;
END $$;

-- stock_transfer_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transfer_header') THEN
    CREATE TABLE public.stock_transfer_header (
        id uuid NOT NULL,
        transfer_number text NOT NULL,
        transfer_date date NOT NULL,
        from_shop_id uuid NOT NULL,
        to_shop_id uuid NOT NULL,
        from_storage_location_id uuid,
        to_storage_location_id uuid,
        status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
        notes text,
        posted_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        created_via public."StockTransferCreatedVia" DEFAULT 'MANUAL'::public."StockTransferCreatedVia" NOT NULL,
        dispatched_at timestamp(6) with time zone,
        received_at timestamp(6) with time zone,
        dispatched_by uuid,
        received_by uuid
    );
  END IF;
END $$;

-- stock_transfer_item_lots
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transfer_item_lots') THEN
    CREATE TABLE public.stock_transfer_item_lots (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        transfer_item_id uuid NOT NULL,
        lot_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL
    );
  END IF;
END $$;

-- stock_transfer_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transfer_items') THEN
    CREATE TABLE public.stock_transfer_items (
        id uuid NOT NULL,
        transfer_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL,
        uom text NOT NULL
    );
  END IF;
END $$;

-- stock_transfer_status_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transfer_status_history') THEN
    CREATE TABLE public.stock_transfer_status_history (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        transfer_id uuid NOT NULL,
        from_status public."DocumentStatus",
        to_status public."DocumentStatus" NOT NULL,
        changed_by uuid,
        changed_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        remarks text
    );
  END IF;
END $$;

-- storage_locations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_locations') THEN
    CREATE TABLE public.storage_locations (
        id uuid NOT NULL,
        shop_id uuid NOT NULL,
        code text NOT NULL,
        name text NOT NULL,
        description text,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- subscription_invoices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_invoices') THEN
    CREATE TABLE public.subscription_invoices (
        id uuid NOT NULL,
        invoice_number text NOT NULL,
        company_id uuid NOT NULL,
        plan public."SubscriptionPlan" NOT NULL,
        billing_cycle public."BillingCycle" NOT NULL,
        amount_paise integer NOT NULL,
        tax_paise integer DEFAULT 0 NOT NULL,
        total_paise integer NOT NULL,
        currency text DEFAULT 'INR'::text NOT NULL,
        gst_number text,
        billing_address_snapshot jsonb,
        issued_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        pdf_storage_key text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- subscription_payments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_payments') THEN
    CREATE TABLE public.subscription_payments (
        id uuid NOT NULL,
        company_id uuid,
        plan public."SubscriptionPlan" NOT NULL,
        billing_cycle public."BillingCycle" NOT NULL,
        amount_paise integer NOT NULL,
        currency text DEFAULT 'INR'::text NOT NULL,
        razorpay_order_id text NOT NULL,
        razorpay_payment_id text,
        status text DEFAULT 'pending'::text NOT NULL,
        verified_at timestamp with time zone,
        consumed_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        invoice_id uuid,
        failure_reason text,
        renewal_attempt integer DEFAULT 0 NOT NULL
    );
  END IF;
END $$;

-- supplier_bill_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_bill_header') THEN
    CREATE TABLE public.supplier_bill_header (
        id uuid NOT NULL,
        bill_number text NOT NULL,
        bill_date date NOT NULL,
        due_date date,
        shop_id uuid NOT NULL,
        supplier_id uuid NOT NULL,
        purchase_order_id uuid,
        goods_receipt_id uuid,
        status public."SupplierBillStatus" DEFAULT 'DRAFT'::public."SupplierBillStatus" NOT NULL,
        total_value numeric(14,2) NOT NULL,
        paid_value numeric(14,2) DEFAULT 0 NOT NULL,
        remarks text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL
    );
  END IF;
END $$;

-- supplier_bill_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_bill_items') THEN
    CREATE TABLE public.supplier_bill_items (
        id uuid NOT NULL,
        bill_header_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL,
        uom text NOT NULL,
        unit_cost numeric(12,2) NOT NULL,
        line_value numeric(14,2) NOT NULL
    );
  END IF;
END $$;

-- supplier_payments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_payments') THEN
    CREATE TABLE public.supplier_payments (
        id uuid NOT NULL,
        payment_number text NOT NULL,
        payment_date date NOT NULL,
        supplier_bill_id uuid NOT NULL,
        shop_id uuid NOT NULL,
        amount numeric(14,2) NOT NULL,
        method text,
        reference text,
        remarks text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL
    );
  END IF;
END $$;

-- supplier_quote_header
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_quote_header') THEN
    CREATE TABLE public.supplier_quote_header (
        id uuid NOT NULL,
        quote_number text NOT NULL,
        quote_date date NOT NULL,
        shop_id uuid NOT NULL,
        rfq_id uuid NOT NULL,
        supplier_id uuid NOT NULL,
        notes text,
        status public."DocumentStatus" DEFAULT 'DRAFT'::public."DocumentStatus" NOT NULL,
        posted_at timestamp(6) with time zone,
        total_value numeric(14,2),
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- supplier_quote_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_quote_items') THEN
    CREATE TABLE public.supplier_quote_items (
        id uuid NOT NULL,
        quote_header_id uuid NOT NULL,
        rfq_item_id uuid,
        product_id uuid,
        description text,
        quantity numeric(12,3) NOT NULL,
        uom text NOT NULL,
        specifications text,
        unit_price numeric(12,2) NOT NULL,
        line_value numeric(14,2) NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- supplier_return_images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_return_images') THEN
    CREATE TABLE public.supplier_return_images (
        id uuid NOT NULL,
        return_id uuid NOT NULL,
        return_item_id uuid,
        file_path text NOT NULL,
        public_url text NOT NULL,
        original_filename text NOT NULL,
        mime_type text NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid
    );
  END IF;
END $$;

-- supplier_return_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_return_items') THEN
    CREATE TABLE public.supplier_return_items (
        id uuid NOT NULL,
        return_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity numeric(12,3) NOT NULL,
        uom text NOT NULL,
        unit_cost numeric(12,2) NOT NULL,
        line_value numeric(14,2) NOT NULL,
        goods_receipt_item_id uuid,
        grn_quantity numeric(12,3),
        reason_code public."SupplierReturnReasonCode"
    );
  END IF;
END $$;

-- supplier_returns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_returns') THEN
    CREATE TABLE public.supplier_returns (
        id uuid NOT NULL,
        return_number text NOT NULL,
        return_date date NOT NULL,
        shop_id uuid NOT NULL,
        supplier_name text NOT NULL,
        purchase_order_id uuid,
        reason text,
        remarks text,
        status public."ReturnStatus" DEFAULT 'DRAFT'::public."ReturnStatus" NOT NULL,
        total_value numeric(14,2) DEFAULT 0 NOT NULL,
        posted_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        supplier_id uuid,
        goods_receipt_id uuid,
        supplier_ref text,
        internal_cc_email text,
        submitted_at timestamp(6) with time zone,
        acknowledged_at timestamp(6) with time zone,
        email_sent_at timestamp(6) with time zone,
        ack_token_hash text,
        email_message_id text,
        branding_mode public."BrandingMode" DEFAULT 'SNAPSHOT'::public."BrandingMode" NOT NULL,
        branding_snapshot jsonb,
        branding_version integer,
        template_version integer DEFAULT 1 NOT NULL
    );
  END IF;
END $$;

-- suppliers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    CREATE TABLE public.suppliers (
        id uuid NOT NULL,
        supplier_code text NOT NULL,
        supplier_name text NOT NULL,
        company_id uuid,
        tax_id text,
        vat_number text,
        rating integer DEFAULT 0 NOT NULL,
        categories text[] DEFAULT ARRAY[]::text[] NOT NULL,
        contact_person text,
        email text,
        phone text,
        street text,
        city text,
        state text,
        postal_code text,
        country text,
        payment_terms text,
        bank_name text,
        account_number text,
        routing_number text,
        iban text,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        deleted_at timestamp(6) with time zone
    );
  END IF;
END $$;

-- system_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
    CREATE TABLE public.system_settings (
        id uuid NOT NULL,
        key text NOT NULL,
        value jsonb NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid
    );
  END IF;
END $$;

-- trusted_mfa_devices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trusted_mfa_devices') THEN
    CREATE TABLE public.trusted_mfa_devices (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        token_hash text NOT NULL,
        ip text,
        user_agent text,
        last_used_at timestamp(6) with time zone,
        expires_at timestamp(6) with time zone NOT NULL,
        revoked_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- user_backup_codes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_backup_codes') THEN
    CREATE TABLE public.user_backup_codes (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        code_hash text NOT NULL,
        consumed_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- user_channel_links
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_channel_links') THEN
    CREATE TABLE public.user_channel_links (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        company_id uuid NOT NULL,
        channel public."ChatChannel" DEFAULT 'WHATSAPP'::public."ChatChannel" NOT NULL,
        phone_number text NOT NULL,
        status public."ChannelLinkStatus" DEFAULT 'PENDING'::public."ChannelLinkStatus" NOT NULL,
        verified_at timestamp(6) with time zone,
        last_seen_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- user_invitations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
    CREATE TABLE public.user_invitations (
        id uuid NOT NULL,
        email text NOT NULL,
        name text,
        role_id uuid NOT NULL,
        shop_id uuid,
        token_hash text NOT NULL,
        invited_by uuid NOT NULL,
        expires_at timestamp(6) with time zone NOT NULL,
        consumed_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

-- users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    CREATE TABLE public.users (
        id uuid NOT NULL,
        name text NOT NULL,
        email text NOT NULL,
        password_hash text NOT NULL,
        role_id uuid NOT NULL,
        shop_id uuid,
        is_active boolean DEFAULT true NOT NULL,
        last_login_at timestamp(6) with time zone,
        refresh_token_hash text,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL,
        created_by uuid,
        updated_by uuid,
        avatar_url text,
        deleted_at timestamp(6) with time zone,
        failed_login_count integer DEFAULT 0 NOT NULL,
        locked_until timestamp(6) with time zone,
        password_changed_at timestamp(6) with time zone,
        mfa_enabled boolean DEFAULT false NOT NULL,
        mfa_method public."MfaMethod",
        mfa_enrolled_at timestamp(6) with time zone,
        mfa_secret_encrypted text
    );
  END IF;
END $$;

-- whatsapp_devices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_devices') THEN
    CREATE TABLE public.whatsapp_devices (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        user_id uuid NOT NULL,
        phone_number text NOT NULL,
        nickname text,
        device_type text,
        status public."WhatsAppDeviceStatus" DEFAULT 'ACTIVE'::public."WhatsAppDeviceStatus" NOT NULL,
        linked_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        last_seen_at timestamp(6) with time zone,
        revoked_at timestamp(6) with time zone,
        revoked_by_id uuid,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp(6) with time zone NOT NULL
    );
  END IF;
END $$;

-- whatsapp_link_tokens
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_link_tokens') THEN
    CREATE TABLE public.whatsapp_link_tokens (
        id uuid NOT NULL,
        company_id uuid NOT NULL,
        user_id uuid NOT NULL,
        token_hash text NOT NULL,
        token_version text DEFAULT 'V1'::text NOT NULL,
        status public."LinkTokenStatus" DEFAULT 'ACTIVE'::public."LinkTokenStatus" NOT NULL,
        expires_at timestamp(6) with time zone NOT NULL,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        used_at timestamp(6) with time zone,
        linked_phone text,
        attempt_count integer DEFAULT 0 NOT NULL,
        generated_ip text,
        generated_user_agent text
    );
  END IF;
END $$;

-- whatsapp_verifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_verifications') THEN
    CREATE TABLE public.whatsapp_verifications (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        company_id uuid NOT NULL,
        phone_number text NOT NULL,
        otp_hash text NOT NULL,
        attempt_count integer DEFAULT 0 NOT NULL,
        expires_at timestamp(6) with time zone NOT NULL,
        consumed_at timestamp(6) with time zone,
        created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  END IF;
END $$;

