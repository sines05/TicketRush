package handler

import (
	"net/http"
	"strconv"
	"time"
	"ticketrush/internal/dto"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ReviewHandler struct {
	reviewRepo repository.ReviewRepository
	eventRepo  repository.EventRepository
}

func NewReviewHandler(reviewRepo repository.ReviewRepository, eventRepo repository.EventRepository) *ReviewHandler {
	return &ReviewHandler{
		reviewRepo: reviewRepo,
		eventRepo:  eventRepo,
	}
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

	// Check if event has started
	event, err := h.eventRepo.GetEventByID(input.EventID)
	if err != nil {
		utils.SendError(c, http.StatusNotFound, "Event not found", "EVENT_NOT_FOUND")
		return
	}

	if time.Now().Before(event.StartTime) {
		utils.SendError(c, http.StatusBadRequest, "You can only review an event after it has started", "EVENT_NOT_STARTED")
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

func (h *ReviewHandler) GetFeaturedReviews(c *gin.Context) {
	limit := 12
	if limitParam := c.Query("limit"); limitParam != "" {
		parsed, err := strconv.Atoi(limitParam)
		if err == nil && parsed >= 1 {
			if parsed > 24 {
				limit = 24
			} else {
				limit = parsed
			}
		}
	}

	reviews, err := h.reviewRepo.GetFeaturedReviews(c.Request.Context(), 4, limit)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to fetch featured reviews", "INTERNAL_ERROR")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToReviewResponses(reviews), "Featured reviews fetched successfully")
}
