package models

import (
	"github.com/google/uuid"
)

type ComplaintStatus string

const (
	ComplaintPending  ComplaintStatus = "PENDING"
	ComplaintResolved ComplaintStatus = "RESOLVED"
	ComplaintRejected ComplaintStatus = "REJECTED"
)

type Complaint struct {
	BaseModel
	UserID  uuid.UUID       `gorm:"type:uuid;not null;index:idx_complaints_user_id" json:"user_id"`
	Title   string          `gorm:"type:varchar(255);not null" json:"title"`
	Content string          `gorm:"type:text;not null" json:"content"`
	Status  ComplaintStatus `gorm:"type:varchar(20);default:'PENDING'" json:"status"`
	User    User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
