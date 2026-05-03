-- 000003_add_event_zones_layout_meta.up.sql

ALTER TABLE event_zones
ADD COLUMN IF NOT EXISTS layout_meta JSONB NOT NULL DEFAULT '{}'::jsonb;
