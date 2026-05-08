package models

import (
	"github.com/google/uuid"
)

type Review struct {
	BaseModel
	UserID  uuid.UUID `gorm:"type:uuid;not null;index:idx_reviews_user_event" json:"user_id"`
	EventID uuid.UUID `gorm:"type:uuid;not null;index:idx_reviews_user_event;index:idx_reviews_event_id" json:"event_id"`
	Rating  int       `gorm:"not null" json:"rating"`
	Comment string    `gorm:"type:text" json:"comment"`
	User    User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Event   Event     `gorm:"foreignKey:EventID" json:"-"`
}
