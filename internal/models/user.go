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
	Email        string     `gorm:"uniqueIndex;not null;type:varchar(255)" json:"email"`
	PasswordHash string     `gorm:"not null;type:varchar(255)" json:"-"`
	FullName     string     `gorm:"not null;type:varchar(100)" json:"full_name"`
	Role         UserRole   `gorm:"type:varchar(20);default:'CUSTOMER'" json:"role"`
	Gender       GenderType `gorm:"type:varchar(20)" json:"gender"`
	DateOfBirth  time.Time  `gorm:"type:date" json:"date_of_birth"`
}

type PasswordReset struct {
	BaseModel
	UserID    uuid.UUID `gorm:"type:uuid;not null;index:idx_password_resets_user_id" json:"user_id"`
	Token     string    `gorm:"type:varchar(255);uniqueIndex:idx_password_resets_token;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
