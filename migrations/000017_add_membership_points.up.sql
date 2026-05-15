ALTER TABLE users
    ADD COLUMN IF NOT EXISTS membership_points integer NOT NULL DEFAULT 0;

ALTER TABLE membership_tiers
    ADD COLUMN IF NOT EXISTS required_points integer NOT NULL DEFAULT 0;

UPDATE membership_tiers
SET required_points = CASE name
    WHEN 'BRONZE' THEN 0
    WHEN 'SILVER' THEN 1000
    WHEN 'GOLD' THEN 5000
    WHEN 'PLATINUM' THEN 7000
    ELSE required_points
END;

UPDATE membership_tiers
SET description = CASE name
    WHEN 'BRONZE' THEN 'Standard membership'
    WHEN 'SILVER' THEN 'Silver membership from 1000 points'
    WHEN 'GOLD' THEN 'Gold membership from 5000 points'
    WHEN 'PLATINUM' THEN 'Platinum membership from 7000 points'
    ELSE description
END;
