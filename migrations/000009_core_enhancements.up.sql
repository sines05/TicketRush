-- 000009_core_enhancements.up.sql

-- 1. Events Updates
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_queue_mode BOOLEAN DEFAULT FALSE;

-- 2. Membership Tiers
CREATE TABLE IF NOT EXISTS membership_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    priority_level INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_membership_tiers_deleted_at ON membership_tiers(deleted_at);

-- 2. Update Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_tier_id UUID REFERENCES membership_tiers(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_token VARCHAR(255);

-- 3. Social Accounts
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_deleted_at ON social_accounts(deleted_at);

-- 4. Complaints
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RESOLVED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_deleted_at ON complaints(deleted_at);

-- 5. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    event_id UUID NOT NULL REFERENCES events(id),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_reviews_user_event ON reviews(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_reviews_event_id ON reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews(deleted_at);

-- Seed Default Membership Tiers if they don't exist
INSERT INTO membership_tiers (name, priority_level, description)
SELECT 'BRONZE', 0, 'Standard membership'
WHERE NOT EXISTS (SELECT 1 FROM membership_tiers WHERE name = 'BRONZE');

INSERT INTO membership_tiers (name, priority_level, description)
SELECT 'SILVER', 1, 'Silver membership with basic priority'
WHERE NOT EXISTS (SELECT 1 FROM membership_tiers WHERE name = 'SILVER');

INSERT INTO membership_tiers (name, priority_level, description)
SELECT 'GOLD', 2, 'Gold membership with high priority'
WHERE NOT EXISTS (SELECT 1 FROM membership_tiers WHERE name = 'GOLD');

INSERT INTO membership_tiers (name, priority_level, description)
SELECT 'PLATINUM', 3, 'Platinum membership with maximum priority'
WHERE NOT EXISTS (SELECT 1 FROM membership_tiers WHERE name = 'PLATINUM');
