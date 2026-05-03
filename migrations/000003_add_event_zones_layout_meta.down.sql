-- 000003_add_event_zones_layout_meta.down.sql

ALTER TABLE event_zones
DROP COLUMN IF EXISTS layout_meta;
