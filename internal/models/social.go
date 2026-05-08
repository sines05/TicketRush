package models

import (
	"github.com/google/uuid"
)

type SocialAccount struct {
	BaseModel
	UserID         uuid.UUID `gorm:"type:uuid;not null;index:idx_social_accounts_user_id" json:"user_id"`
	Provider       string    `gorm:"type:varchar(50);not null;uniqueIndex:idx_social_provider_user" json:"provider"`
	ProviderUserID string    `gorm:"type:varchar(255);not null;uniqueIndex:idx_social_provider_user" json:"provider_user_id"`
	User           User      `gorm:"foreignKey:UserID" json:"-"`
}
