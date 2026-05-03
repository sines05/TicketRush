-- Add category column to events
ALTER TABLE events
ADD COLUMN category varchar(100) NOT NULL DEFAULT 'Khác';
