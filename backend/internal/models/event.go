package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type SeatStatus string

const (
	SeatAvailable SeatStatus = "AVAILABLE"
	SeatLocked    SeatStatus = "LOCKED"
	SeatSold      SeatStatus = "SOLD"
)

type Event struct {
	BaseModel
	Title       string    `gorm:"not null;type:varchar(255)"`
	Description string    `gorm:"type:text"`
	BannerURL   string    `gorm:"type:varchar(255)"`
	Category    string    `gorm:"type:varchar(100);not null;default:'Khác'"`
	StartTime   time.Time `gorm:"not null"`
	EndTime     time.Time
	IsPublished bool        `gorm:"default:false"`
	IsFeatured  bool        `gorm:"default:false"`
	Zones       []EventZone `gorm:"foreignKey:EventID"`
}

type EventZone struct {
	BaseModel
	EventID     uuid.UUID      `gorm:"type:uuid;not null;index:idx_event_zone_name,unique"`
	Name        string         `gorm:"not null;type:varchar(50);index:idx_event_zone_name,unique"`
	Price       float64        `gorm:"type:decimal(12,2);not null"`
	TotalRows   int            `gorm:"not null"`
	SeatsPerRow int            `gorm:"not null"`
	LayoutMeta  datatypes.JSON `gorm:"type:jsonb;not null;default:'{}'"`
	Seats       []Seat         `gorm:"foreignKey:ZoneID"`
	Event       Event          `gorm:"foreignKey:EventID"`
}

type Seat struct {
	BaseModel
	ZoneID         uuid.UUID  `gorm:"type:uuid;not null;index:idx_seats_zone_row_num,unique;index:idx_seats_zone_status"`
	RowLabel       string     `gorm:"not null;type:varchar(10);index:idx_seats_zone_row_num,unique"`
	SeatNumber     int        `gorm:"not null;index:idx_seats_zone_row_num,unique"`
	Status         SeatStatus `gorm:"type:varchar(20);default:'AVAILABLE';index:idx_seats_zone_status;index:idx_seats_expiration"`
	LockedByUserID *uuid.UUID `gorm:"type:uuid"`
	LockedAt       *time.Time `gorm:"index:idx_seats_expiration"`
	Zone           EventZone  `gorm:"foreignKey:ZoneID"`
}
