package models

import (
	"github.com/google/uuid"
	"time"
)

type SeatStatus string

const (
	SeatAvailable SeatStatus = "AVAILABLE"
	SeatLocked    SeatStatus = "LOCKED"
	SeatSold      SeatStatus = "SOLD"
)

type Event struct {
	BaseModel
	Title       string      `gorm:"not null;type:varchar(255)" json:"title"`
	Description string      `gorm:"type:text" json:"description"`
	BannerURL   string      `gorm:"type:varchar(255)" json:"banner_url"`
	StartTime   time.Time   `gorm:"not null" json:"start_time"`
	EndTime     time.Time   `json:"end_time"`
	IsPublished bool        `gorm:"default:false" json:"is_published"`
	Zones       []EventZone `gorm:"foreignKey:EventID" json:"zones,omitempty"`
}

type EventZone struct {
	BaseModel
	EventID     uuid.UUID `gorm:"type:uuid;not null;index:idx_event_zone_name,unique" json:"event_id"`
	Name        string    `gorm:"not null;type:varchar(50);index:idx_event_zone_name,unique" json:"name"`
	Price       float64   `gorm:"type:decimal(12,2);not null" json:"price"`
	TotalRows   int       `gorm:"not null" json:"total_rows"`
	SeatsPerRow int       `gorm:"not null" json:"seats_per_row"`
	Seats       []Seat    `gorm:"foreignKey:ZoneID" json:"seats,omitempty"`
	Event       Event     `gorm:"foreignKey:EventID" json:"-"`
}

type Seat struct {
	BaseModel
	ZoneID         uuid.UUID  `gorm:"type:uuid;not null;index:idx_seats_zone_row_num,unique;index:idx_seats_zone_status" json:"zone_id"`
	RowLabel       string     `gorm:"not null;type:varchar(10);index:idx_seats_zone_row_num,unique" json:"row_label"`
	SeatNumber     int        `gorm:"not null;index:idx_seats_zone_row_num,unique" json:"seat_number"`
	Status         SeatStatus `gorm:"type:varchar(20);default:'AVAILABLE';index:idx_seats_zone_status;index:idx_seats_expiration" json:"status"`
	LockedByUserID *uuid.UUID `gorm:"type:uuid" json:"locked_by_user_id,omitempty"`
	LockedAt       *time.Time `gorm:"index:idx_seats_expiration" json:"locked_at,omitempty"`
	Zone           EventZone  `gorm:"foreignKey:ZoneID" json:"zone,omitempty"`
}
