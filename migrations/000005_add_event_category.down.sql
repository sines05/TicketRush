-- Remove category column from events
ALTER TABLE events
DROP COLUMN IF EXISTS category;
