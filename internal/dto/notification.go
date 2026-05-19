package dto

import (
	"time"

	"github.com/google/uuid"
	"ticketrush/internal/models"
)

type NotificationResponse struct {
	ID            uuid.UUID        `json:"id"`
	UserID        *uuid.UUID       `json:"user_id"`
	Title         string           `json:"title"`
	Message       string           `json:"message"`
	Type          models.NotifType `json:"type"`
	ReferenceType string           `json:"reference_type"`
	ReferenceID   *uuid.UUID       `json:"reference_id"`
	IsRead        bool             `json:"is_read"`
	IsBroadcast   bool             `json:"is_broadcast"`
	CreatedAt     time.Time        `json:"created_at"`
}

type NotificationListResponse struct {
	Notifications []NotificationResponse `json:"notifications"`
	Total         int64                  `json:"total"`
	Page          int                    `json:"page"`
	Limit         int                    `json:"limit"`
}

type UnreadCountResponse struct {
	Count int64 `json:"count"`
}

func ToNotificationResponse(n models.Notification) NotificationResponse {
	return NotificationResponse{
		ID:            n.ID,
		UserID:        n.UserID,
		Title:         n.Title,
		Message:       n.Message,
		Type:          n.Type,
		ReferenceType: n.ReferenceType,
		ReferenceID:   n.ReferenceID,
		IsRead:        n.IsRead,
		IsBroadcast:   n.IsBroadcast,
		CreatedAt:     n.CreatedAt,
	}
}

func ToNotificationResponses(notifications []models.Notification) []NotificationResponse {
	responses := make([]NotificationResponse, len(notifications))
	for i, n := range notifications {
		responses[i] = ToNotificationResponse(n)
	}
	return responses
}
