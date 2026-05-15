ALTER TABLE complaints
    DROP CONSTRAINT IF EXISTS complaints_rating_check;

ALTER TABLE complaints
    DROP COLUMN IF EXISTS rating;
