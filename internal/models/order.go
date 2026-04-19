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
	UserID      uuid.UUID   `gorm:"type:uuid;not null"`
	EventID     uuid.UUID   `gorm:"type:uuid;not null;index:idx_orders_status_event"`
	TotalAmount float64     `gorm:"type:decimal(12,2);not null"`
	Status      OrderStatus `gorm:"type:varchar(20);default:'PENDING';index:idx_orders_status_event"`
	ExpiresAt   time.Time   `gorm:"not null"`
	OrderItems  []OrderItem `gorm:"foreignKey:OrderID"`
}

type OrderItem struct {
	BaseModel
	OrderID uuid.UUID `gorm:"type:uuid;not null;index:idx_order_seat,unique"`
	SeatID  uuid.UUID `gorm:"type:uuid;not null;index:idx_order_seat,unique"`
	Price   float64   `gorm:"type:decimal(12,2);not null"`
}

type Ticket struct {
	BaseModel
	OrderID     uuid.UUID `gorm:"type:uuid;not null"`
	SeatID      uuid.UUID `gorm:"type:uuid;unique;not null"`
	UserID      uuid.UUID `gorm:"type:uuid;not null"`
	QRCodeToken string    `gorm:"uniqueIndex;not null;type:varchar(255)"`
	IsCheckedIn bool      `gorm:"default:false"`
	Seat        Seat      `gorm:"foreignKey:SeatID"`
}
