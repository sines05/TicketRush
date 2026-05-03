-- 000004_fix_event_zones_unique_index.up.sql

-- Fix: allow re-creating zones with same name after soft-delete.
-- The previous unique index on (event_id, name) also covered soft-deleted rows,
-- causing duplicate key errors on updates.

DROP INDEX IF EXISTS idx_event_zone_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_zone_name
ON event_zones(event_id, name)
WHERE deleted_at IS NULL;
