-- Upsert role rows with default permission sets (JSON arrays).
INSERT INTO roles (id, name, permissions, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'OWNER', '["user:manage","shop:read","shop:write","company:read","company:write","contract:read","contract:write","product:read","product:write","storage_location:read","storage_location:write","supplier:read","supplier:write","rfq:read","rfq:write","quote:read","quote:write","purchase_order:read","purchase_order:create","purchase_order:approve","goods_receipt:read","goods_receipt:create","goods_issue:read","goods_issue:create","damage:read","damage:create","report:view","report:export","audit_log:read","api:manage","billing:manage","vendor_portal:access"]'::jsonb, now(), now()),
  (gen_random_uuid(), 'WAREHOUSE_STAFF', '["shop:read","company:read","contract:read","product:read","storage_location:read","supplier:read","rfq:read","quote:read","purchase_order:read","goods_receipt:read","goods_receipt:create","goods_issue:read","goods_issue:create","damage:read","damage:create","report:view"]'::jsonb, now(), now()),
  (gen_random_uuid(), 'VIEWER', '["shop:read","company:read","contract:read","product:read","storage_location:read","supplier:read","rfq:read","quote:read","purchase_order:read","goods_receipt:read","goods_issue:read","damage:read","report:view"]'::jsonb, now(), now()),
  (gen_random_uuid(), 'VENDOR', '["vendor_portal:access"]'::jsonb, now(), now())
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  updated_at = now();

-- Align ADMIN / INVENTORY_MANAGER defaults (ADMIN loses billing; inv mgr loses user mgmt + approve).
UPDATE roles SET permissions = '["user:manage","shop:read","shop:write","company:read","company:write","contract:read","contract:write","product:read","product:write","storage_location:read","storage_location:write","supplier:read","supplier:write","rfq:read","rfq:write","quote:read","quote:write","purchase_order:read","purchase_order:create","purchase_order:approve","goods_receipt:read","goods_receipt:create","goods_issue:read","goods_issue:create","damage:read","damage:create","report:view","report:export","audit_log:read","api:manage","vendor_portal:access"]'::jsonb, updated_at = now()
WHERE name = 'ADMIN';

UPDATE roles SET permissions = '["shop:read","shop:write","company:read","company:write","contract:read","contract:write","product:read","product:write","storage_location:read","storage_location:write","supplier:read","supplier:write","rfq:read","rfq:write","quote:read","quote:write","purchase_order:read","purchase_order:create","goods_receipt:read","goods_receipt:create","goods_issue:read","goods_issue:create","damage:read","damage:create","report:view","report:export","vendor_portal:access"]'::jsonb, updated_at = now()
WHERE name = 'INVENTORY_MANAGER';

-- Migrate SHOP_USER accounts to WAREHOUSE_STAFF role row.
UPDATE users u
SET role_id = (SELECT id FROM roles WHERE name = 'WAREHOUSE_STAFF' LIMIT 1)
FROM roles r
WHERE u.role_id = r.id AND r.name = 'SHOP_USER';

-- Promote earliest ADMIN per company to OWNER (org creator).
WITH first_admin AS (
  SELECT DISTINCT ON (s.company_id) u.id AS user_id
  FROM users u
  JOIN shops s ON s.id = u.shop_id
  JOIN roles r ON r.id = u.role_id
  WHERE r.name = 'ADMIN' AND s.company_id IS NOT NULL
  ORDER BY s.company_id, u.created_at ASC
)
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'OWNER' LIMIT 1)
WHERE id IN (SELECT user_id FROM first_admin);
