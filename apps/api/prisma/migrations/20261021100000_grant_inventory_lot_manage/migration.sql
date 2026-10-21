-- Lot block/unblock/scrap endpoints require inventory_lot:manage, but no role
-- was ever granted it. Give it to the roles that already manage stock.
UPDATE roles
SET permissions = permissions || '["inventory_lot:manage"]'::jsonb,
    updated_at = now()
WHERE name IN ('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  AND jsonb_typeof(permissions) = 'array'
  AND NOT permissions ? 'inventory_lot:manage';
