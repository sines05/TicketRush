package dto

import (
	"ticketrush/internal/models"
	"time"

	"github.com/google/uuid"
)

type ReviewResponse struct {
	ID         uuid.UUID     `json:"id"`
	UserID     uuid.UUID     `json:"user_id"`
	EventID    uuid.UUID     `json:"event_id"`
	Rating     int           `json:"rating"`
	Comment    string        `json:"comment"`
	CreatedAt  time.Time     `json:"created_at"`
	User       *UserResponse `json:"user,omitempty"`
	EventTitle string        `json:"event_title,omitempty"`
}

func ToReviewResponse(r *models.Review) ReviewResponse {
	res := ReviewResponse{
		ID:        r.ID,
		UserID:    r.UserID,
		EventID:   r.EventID,
		Rating:    r.Rating,
		Comment:   r.Comment,
		CreatedAt: r.CreatedAt,
	}
	if r.User.ID != uuid.Nil {
		ur := ToUserResponse(r.User)
		res.User = &ur
	}
	if r.Event.ID != uuid.Nil {
		res.EventTitle = r.Event.Title
	}
	return res
}

func ToReviewResponses(reviews []models.Review) []ReviewResponse {
	responses := make([]ReviewResponse, len(reviews))
	for i, r := range reviews {
		responses[i] = ToReviewResponse(&r)
	}
	return responses
}
