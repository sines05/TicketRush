package handler

import (
	"net/http"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MembershipHandler struct {
	membershipRepo repository.MembershipRepository
}

func NewMembershipHandler(membershipRepo repository.MembershipRepository) *MembershipHandler {
	return &MembershipHandler{membershipRepo: membershipRepo}
}

func (h *MembershipHandler) GetTiers(c *gin.Context) {
	tiers, err := h.membershipRepo.GetTiers(c.Request.Context())
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to fetch membership tiers", "INTERNAL_ERROR")
		return
	}
	utils.SendSuccess(c, http.StatusOK, tiers, "Membership tiers fetched successfully")
}

func (h *MembershipHandler) UpgradeTier(c *gin.Context) {
	userIDStr := c.GetString("user_id")
	userID, _ := uuid.Parse(userIDStr)

	var input struct {
		TierID uuid.UUID `json:"tier_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Invalid input", "INVALID_INPUT")
		return
	}

	err := h.membershipRepo.UpdateUserTier(c.Request.Context(), userID, input.TierID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to upgrade membership", "INTERNAL_ERROR")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Membership upgraded successfully")
}
