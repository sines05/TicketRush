-- 000004_fix_event_zones_unique_index.down.sql

DROP INDEX IF EXISTS idx_event_zone_name;

-- Recreate the original (non-partial) unique index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_zone_name
ON event_zones(event_id, name);
