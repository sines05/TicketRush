ALTER TABLE users DROP COLUMN IF EXISTS recovery_codes;
ALTER TABLE users DROP COLUMN IF EXISTS pending_two_factor_secret;
