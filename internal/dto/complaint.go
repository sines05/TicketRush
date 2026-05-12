package dto

import (
	"ticketrush/internal/models"
	"time"

	"github.com/google/uuid"
)

type ComplaintResponse struct {
	ID        uuid.UUID              `json:"id"`
	UserID    uuid.UUID              `json:"user_id"`
	Title     string                 `json:"title"`
	Content   string                 `json:"content"`
	Status    models.ComplaintStatus `json:"status"`
	CreatedAt time.Time              `json:"created_at"`
	UpdatedAt time.Time              `json:"updated_at"`
}

func ToComplaintResponse(c *models.Complaint) ComplaintResponse {
	return ComplaintResponse{
		ID:        c.ID,
		UserID:    c.UserID,
		Title:     c.Title,
		Content:   c.Content,
		Status:    c.Status,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
}

func ToComplaintResponses(complaints []models.Complaint) []ComplaintResponse {
	responses := make([]ComplaintResponse, len(complaints))
	for i, c := range complaints {
		responses[i] = ToComplaintResponse(&c)
	}
	return responses
}
