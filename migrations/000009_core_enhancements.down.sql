-- 000009_core_enhancements.down.sql

DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS social_accounts;
ALTER TABLE users DROP COLUMN IF EXISTS membership_tier_id;
ALTER TABLE users DROP COLUMN IF EXISTS two_factor_secret;
ALTER TABLE users DROP COLUMN IF EXISTS two_factor_enabled;
DROP TABLE IF EXISTS membership_tiers;
