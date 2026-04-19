package models

import (
	"time"
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
	Email        string     `gorm:"uniqueIndex;not null;type:varchar(255)"`
	PasswordHash string     `gorm:"not null;type:varchar(255)"`
	FullName     string     `gorm:"not null;type:varchar(100)"`
	Role         UserRole   `gorm:"type:varchar(20);default:'CUSTOMER'"`
	Gender       GenderType `gorm:"type:varchar(20)"`
	DateOfBirth  time.Time  `gorm:"type:date"`
}
