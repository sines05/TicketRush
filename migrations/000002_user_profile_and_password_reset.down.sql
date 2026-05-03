-- 000002_user_profile_and_password_reset.down.sql

DROP INDEX IF EXISTS idx_users_password_reset_token_hash;

ALTER TABLE users
    DROP COLUMN IF EXISTS avatar_url,
    DROP COLUMN IF EXISTS password_reset_token_hash,
    DROP COLUMN IF EXISTS password_reset_expires_at;
