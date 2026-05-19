package models

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleAdmin    UserRole = "ADMIN"
	RoleCustomer UserRole = "CUSTOMER"
)

type GenderType string

const (
	GenderMale   GenderType = "MALE"
	GenderFemale GenderType = "FEMALE"
	GenderOther  GenderType = "OTHER"
)

type User struct {
	BaseModel
	Email             string          `gorm:"uniqueIndex;not null;type:varchar(255)" json:"email"`
	PasswordHash      string          `gorm:"not null;type:varchar(255)" json:"-"`
	FullName          string          `gorm:"not null;type:varchar(100)" json:"full_name"`
	AvatarURL         string          `gorm:"type:varchar(255)" json:"avatar_url"`
	Role              UserRole        `gorm:"type:varchar(20);default:'CUSTOMER'" json:"role"`
	Gender            GenderType      `gorm:"type:varchar(20)" json:"gender"`
	DateOfBirth       time.Time       `gorm:"type:date" json:"date_of_birth"`
	MembershipPoints  int             `gorm:"not null;default:0" json:"membership_points"`
	MembershipTierID  *uuid.UUID      `gorm:"type:uuid" json:"membership_tier_id,omitempty"`
	MembershipTier    *MembershipTier `gorm:"foreignKey:MembershipTierID" json:"membership_tier,omitempty"`
	TwoFactorSecret   string          `gorm:"type:varchar(255)" json:"-"`
	TwoFactorEnabled  bool            `gorm:"default:false" json:"two_factor_enabled"`
	RecoveryCodes     string          `gorm:"type:text" json:"-"`
	PendingTwoFactorSecret string     `gorm:"type:varchar(255)" json:"-"`
	IsOAuth           bool            `gorm:"column:is_oauth;default:false" json:"is_oauth"`
	NotificationToken string          `gorm:"type:varchar(255)" json:"notification_token"`
}

type MembershipTier struct {
	BaseModel
	Name           string `gorm:"uniqueIndex;not null;type:varchar(50)" json:"name"`
	PriorityLevel  int    `gorm:"default:0" json:"priority_level"`
	RequiredPoints int    `gorm:"not null;default:0" json:"required_points"`
	Description    string `gorm:"type:text" json:"description"`
}

type PasswordReset struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index:idx_password_resets_user_id" json:"user_id"`
	Token     string    `gorm:"type:varchar(255);uniqueIndex:idx_password_resets_token;not null" json:"token"` // SHA-256 hashed token
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
