package models

import "github.com/google/uuid"

type NotifType string

const (
	NotifTypeSystem          NotifType = "SYSTEM"
	NotifTypeOrder           NotifType = "ORDER"
	NotifTypeEventReminder   NotifType = "EVENT_REMINDER"
	NotifTypePaymentReminder NotifType = "PAYMENT_REMINDER"
	NotifTypePromotion       NotifType = "PROMOTION"
	NotifTypeAdmin           NotifType = "ADMIN"
)

type Notification struct {
	BaseModel
	UserID        *uuid.UUID `gorm:"type:uuid;index:idx_notifications_user_id;index:idx_notifications_user_read" json:"user_id"`
	Title         string     `gorm:"not null;type:varchar(255)" json:"title"`
	Message       string     `gorm:"not null;type:text" json:"message"`
	Type          NotifType  `gorm:"not null;type:varchar(50);default:'SYSTEM';index:idx_notifications_type" json:"type"`
	ReferenceType string     `gorm:"type:varchar(50)" json:"reference_type"`
	ReferenceID   *uuid.UUID `gorm:"type:uuid" json:"reference_id"`
	IsRead        bool       `gorm:"default:false;index:idx_notifications_user_read" json:"is_read"`
	IsBroadcast   bool       `gorm:"default:false" json:"is_broadcast"`
}
