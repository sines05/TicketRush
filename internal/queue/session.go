package queue

import (
	"time"

	"github.com/google/uuid"
)

type QueueSession struct {
	Token     string     `json:"token"`
	UserID    uuid.UUID  `json:"user_id"`
	EventID   uuid.UUID  `json:"event_id"`
	Status    string     `json:"status"`                 // "waiting" or "allowed"
	JoinIndex int64      `json:"join_index"`             // user's absolute position in queue
	OrderID   *uuid.UUID `json:"order_id,omitempty"`     // populated if they locked a seat
	ExpiresAt *time.Time `json:"expires_at,omitempty"`   // populated if they locked a seat
	AllowedAt *time.Time `json:"allowed_at,omitempty"`   // populated when they are allowed to book
}
