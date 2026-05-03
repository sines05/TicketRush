package models

import (
	"github.com/google/uuid"
	"time"
)

type OrderStatus string

const (
	OrderPending   OrderStatus = "PENDING"
	OrderCompleted OrderStatus = "COMPLETED"
	OrderCancelled OrderStatus = "CANCELLED"
)

type Order struct {
	BaseModel
	UserID      uuid.UUID   `gorm:"type:uuid;not null" json:"user_id"`
	EventID     uuid.UUID   `gorm:"type:uuid;not null;index:idx_orders_status_event" json:"event_id"`
	TotalAmount float64     `gorm:"type:decimal(12,2);not null" json:"total_amount"`
	Status      OrderStatus `gorm:"type:varchar(20);default:'PENDING';index:idx_orders_status_event" json:"status"`
	ExpiresAt   time.Time   `gorm:"not null" json:"expires_at"`
	OrderItems  []OrderItem `gorm:"foreignKey:OrderID" json:"order_items,omitempty"`
}

type OrderItem struct {
	BaseModel
	OrderID uuid.UUID `gorm:"type:uuid;not null;index:idx_order_seat,unique" json:"order_id"`
	SeatID  uuid.UUID `gorm:"type:uuid;not null;index:idx_order_seat,unique" json:"seat_id"`
	Price   float64   `gorm:"type:decimal(12,2);not null" json:"price"`
}

type Ticket struct {
	BaseModel
	OrderID     uuid.UUID `gorm:"type:uuid;not null" json:"order_id"`
	SeatID      uuid.UUID `gorm:"type:uuid;unique;not null" json:"seat_id"`
	UserID      uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	QRCodeToken string    `gorm:"uniqueIndex;not null;type:varchar(255)" json:"qr_code_token"`
	IsCheckedIn bool      `gorm:"default:false" json:"is_checked_in"`
	Seat        Seat      `gorm:"foreignKey:SeatID" json:"seat,omitempty"`
}
