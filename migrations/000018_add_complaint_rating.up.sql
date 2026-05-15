ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS rating integer NOT NULL DEFAULT 5;

ALTER TABLE complaints
    DROP CONSTRAINT IF EXISTS complaints_rating_check;

ALTER TABLE complaints
    ADD CONSTRAINT complaints_rating_check CHECK (rating >= 1 AND rating <= 5);
