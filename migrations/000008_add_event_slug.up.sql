-- Up
ALTER TABLE events ADD COLUMN slug VARCHAR(255);
-- Populate slug for existing events using ID if we don't want to do complex regex in SQL
-- Or use a basic replace for spaces to hyphens for now
UPDATE events SET slug = LOWER(REPLACE(title, ' ', '-')) || '-' || SUBSTR(id::text, 1, 8);
ALTER TABLE events ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_events_slug ON events(slug);
