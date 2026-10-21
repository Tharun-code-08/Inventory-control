-- Email notification defaults used to live in one row shared by every tenant.
-- They are now stored per company. Hand the old shared row to the company of
-- the user who last saved it; every other company starts from the defaults.
INSERT INTO system_settings (id, key, value, created_at, updated_at, created_by, updated_by)
SELECT gen_random_uuid(),
       'email_notifications_config_v1:company:' || s.company_id,
       ss.value,
       now(),
       now(),
       ss.created_by,
       ss.updated_by
FROM system_settings ss
JOIN users u ON u.id = ss.updated_by
JOIN shops s ON s.id = u.shop_id
WHERE ss.key = 'email_notifications_config_v1:global'
  AND s.company_id IS NOT NULL
ON CONFLICT (key) DO NOTHING;
