package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"ticketrush/internal/dto"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"
)

type AIInternalHandler struct {
	userRepo  repository.UserRepository
	orderRepo repository.OrderRepository
}

func NewAIInternalHandler(userRepo repository.UserRepository, orderRepo repository.OrderRepository) *AIInternalHandler {
	return &AIInternalHandler{
		userRepo:  userRepo,
		orderRepo: orderRepo,
	}
}

func (h *AIInternalHandler) GetUserProfile(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		utils.SendError(c, http.StatusBadRequest, "user_id is required", "MISSING_USER_ID")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "invalid user_id", "INVALID_USER_ID")
		return
	}

	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		utils.SendError(c, http.StatusNotFound, "user not found", "USER_NOT_FOUND")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToUserResponse(*user), "User profile fetched")
}

func (h *AIInternalHandler) GetUserOrders(c *gin.Context) {
	userIDStr := c.Query("user_id")
	trustedUserID := c.GetHeader("X-User-ID")

	// Security: If a trusted user ID is provided by the internal proxy, enforce it.
	if trustedUserID != "" && trustedUserID != userIDStr {
		utils.SendError(c, http.StatusForbidden, "Cross-user data access forbidden", "FORBIDDEN_ACCESS")
		return
	}

	if userIDStr == "" {
		utils.SendError(c, http.StatusBadRequest, "user_id is required", "MISSING_USER_ID")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "invalid user_id", "INVALID_USER_ID")
		return
	}

	tickets, err := h.orderRepo.GetTicketsByUserID(userID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "failed to fetch user orders", "FETCH_ORDERS_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToTicketResponses(tickets), "User orders fetched")
}
