package handler

import (
	"net/http"
	"ticketrush/internal/dto"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ReviewHandler struct {
	reviewRepo repository.ReviewRepository
}

func NewReviewHandler(reviewRepo repository.ReviewRepository) *ReviewHandler {
	return &ReviewHandler{reviewRepo: reviewRepo}
}

func (h *ReviewHandler) CreateReview(c *gin.Context) {
	userObj, exists := c.Get("user")
	if !exists {
		utils.SendError(c, http.StatusUnauthorized, "User not found in context", "UNAUTHORIZED")
		return
	}
	user := userObj.(*models.User)
	userID := user.ID

	var input struct {
		EventID uuid.UUID `json:"event_id" binding:"required"`
		Rating  int       `json:"rating" binding:"required,min=1,max=5"`
		Comment string    `json:"comment"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Invalid input", "INVALID_INPUT")
		return
	}

	if err := h.reviewRepo.CreateReview(c.Request.Context(), &models.Review{
		UserID:  userID,
		EventID: input.EventID,
		Rating:  input.Rating,
		Comment: input.Comment,
	}); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to submit review", "INTERNAL_ERROR")
		return
	}

	utils.SendSuccess(c, http.StatusCreated, nil, "Review submitted successfully")
}

func (h *ReviewHandler) GetEventReviews(c *gin.Context) {
	eventIDStr := c.Param("id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "Invalid event ID", "INVALID_ID")
		return
	}

	reviews, err := h.reviewRepo.GetReviewsByEventID(c.Request.Context(), eventID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to fetch reviews", "INTERNAL_ERROR")
		return
	}

	avg, err := h.reviewRepo.GetAverageRating(c.Request.Context(), eventID)
	if err != nil {
		avg = 0 // Default to 0 if error or no reviews
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"reviews":        dto.ToReviewResponses(reviews),
		"average_rating": avg,
	}, "Reviews fetched successfully")
}
