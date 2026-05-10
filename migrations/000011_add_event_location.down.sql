-- 000011_add_event_location.down.sql

DROP INDEX IF EXISTS idx_events_location;
ALTER TABLE events DROP COLUMN IF EXISTS longitude;
ALTER TABLE events DROP COLUMN IF EXISTS latitude;
ALTER TABLE events DROP COLUMN IF EXISTS address;
ALTER TABLE events DROP COLUMN IF EXISTS location;
