package dto

import (
	"ticketrush/internal/models"
	"time"

	"github.com/google/uuid"
)

type ComplaintResponse struct {
	ID        uuid.UUID              `json:"id"`
	UserID    uuid.UUID              `json:"user_id"`
	UserName  string                 `json:"user_name,omitempty"`
	UserEmail string                 `json:"user_email,omitempty"`
	Title     string                 `json:"title"`
	Content   string                 `json:"content"`
	Rating    int                    `json:"rating"`
	Status    models.ComplaintStatus `json:"status"`
	CreatedAt time.Time              `json:"created_at"`
	UpdatedAt time.Time              `json:"updated_at"`
}

type PublicComplaintResponse struct {
	ID        uuid.UUID              `json:"id"`
	UserName  string                 `json:"user_name,omitempty"`
	Title     string                 `json:"title"`
	Content   string                 `json:"content"`
	Rating    int                    `json:"rating"`
	Status    models.ComplaintStatus `json:"status"`
	CreatedAt time.Time              `json:"created_at"`
}

func ToComplaintResponse(c *models.Complaint) ComplaintResponse {
	return ComplaintResponse{
		ID:        c.ID,
		UserID:    c.UserID,
		UserName:  c.User.FullName,
		UserEmail: c.User.Email,
		Title:     c.Title,
		Content:   c.Content,
		Rating:    c.Rating,
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

func ToPublicComplaintResponse(c *models.Complaint) PublicComplaintResponse {
	return PublicComplaintResponse{
		ID:        c.ID,
		UserName:  c.User.FullName,
		Title:     c.Title,
		Content:   c.Content,
		Rating:    c.Rating,
		Status:    c.Status,
		CreatedAt: c.CreatedAt,
	}
}

func ToPublicComplaintResponses(complaints []models.Complaint) []PublicComplaintResponse {
	responses := make([]PublicComplaintResponse, len(complaints))
	for i, c := range complaints {
		responses[i] = ToPublicComplaintResponse(&c)
	}
	return responses
}
