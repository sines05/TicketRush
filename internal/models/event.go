package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"

	"time"

	"github.com/google/uuid"
)

type JSONMap map[string]interface{}

func (j JSONMap) Value() (driver.Value, error) {
	return json.Marshal(j)
}

func (j *JSONMap) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, j)
}

type SeatStatus string

const (
	SeatAvailable SeatStatus = "AVAILABLE"
	SeatLocked    SeatStatus = "LOCKED"
	SeatSold      SeatStatus = "SOLD"
)

type Event struct {
	BaseModel
	Title       string      `gorm:"not null;type:varchar(255)" json:"title"`
	Slug        string      `gorm:"not null;uniqueIndex;type:varchar(255)" json:"slug"`
	Description string      `gorm:"type:text" json:"description"`
	BannerURL   string      `gorm:"type:varchar(255)" json:"banner_url"`
	Location    string      `gorm:"type:varchar(100);not null;default:'Hồ Chí Minh'" json:"location"`
	Address     string      `gorm:"type:text" json:"address"`
	Latitude    float64     `gorm:"type:decimal(10,8)" json:"latitude"`
	Longitude   float64     `gorm:"type:decimal(11,8)" json:"longitude"`
	StartTime   time.Time   `gorm:"not null" json:"start_time"`
	EndTime     time.Time   `json:"end_time"`
	IsPublished bool        `gorm:"default:false" json:"is_published"`
	IsFeatured  bool        `gorm:"default:false" json:"is_featured"`
	IsHero      bool        `gorm:"default:false" json:"is_hero"`
	Category    string      `gorm:"type:varchar(50);not null;default:'music_festival'" json:"category"`
	IsQueueMode bool        `gorm:"default:false" json:"is_queue_mode"`
	Zones       []EventZone `gorm:"foreignKey:EventID" json:"zones,omitempty"`
}

type EventZone struct {
	BaseModel
	EventID     uuid.UUID `gorm:"type:uuid;not null;index:idx_event_zone_name,unique" json:"event_id"`
	Name        string    `gorm:"not null;type:varchar(50);index:idx_event_zone_name,unique" json:"name"`
	Price       float64   `gorm:"type:decimal(12,2);not null" json:"price"`
	TotalRows   int       `gorm:"not null" json:"total_rows"`
	SeatsPerRow int       `gorm:"not null" json:"seats_per_row"`
	// Geometric / layout properties for hierarchical seat map
	CanvasX       float64 `gorm:"type:decimal(10,2);default:0" json:"canvas_x"`
	CanvasY       float64 `gorm:"type:decimal(10,2);default:0" json:"canvas_y"`
	Width         float64 `gorm:"type:decimal(10,2);default:0" json:"width"`
	Height        float64 `gorm:"type:decimal(10,2);default:0" json:"height"`
	RotationAngle float64 `gorm:"type:decimal(6,2);default:0" json:"rotation_angle"`
	Capacity      int     `gorm:"default:0" json:"capacity"`
	ShapeType     string  `gorm:"type:varchar(50);default:'theatre'" json:"shape_type"`
	LayoutMeta    JSONMap `gorm:"type:jsonb;default:'{}'" json:"layout_meta"`
	Seats         []Seat  `gorm:"foreignKey:ZoneID" json:"seats,omitempty"`
	Event         Event   `gorm:"foreignKey:EventID" json:"-"`
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
