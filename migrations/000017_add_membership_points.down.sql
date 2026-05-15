ALTER TABLE membership_tiers
    DROP COLUMN IF EXISTS required_points;

ALTER TABLE users
    DROP COLUMN IF EXISTS membership_points;
