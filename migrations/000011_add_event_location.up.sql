-- 000011_add_event_location.up.sql

ALTER TABLE events ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'Hồ Chí Minh';
ALTER TABLE events ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

CREATE INDEX IF NOT EXISTS idx_events_location ON events(location);
