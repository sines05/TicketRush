package handler

import (
	"net/http"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MembershipHandler struct {
	membershipRepo repository.MembershipRepository
	userRepo       repository.UserRepository
}

func NewMembershipHandler(membershipRepo repository.MembershipRepository, userRepo repository.UserRepository) *MembershipHandler {
	return &MembershipHandler{membershipRepo: membershipRepo, userRepo: userRepo}
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
	userObj, _ := c.Get("user")
	user := userObj.(*models.User)
	userID := user.ID

	var input struct {
		TierID uuid.UUID `json:"tier_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Invalid input", "INVALID_INPUT")
		return
	}

	tier, err := h.membershipRepo.GetTierByID(c.Request.Context(), input.TierID)
	if err != nil {
		utils.SendError(c, http.StatusNotFound, "Membership tier not found", "TIER_NOT_FOUND")
		return
	}
	if user.MembershipPoints < tier.RequiredPoints {
		utils.SendError(c, http.StatusBadRequest, "Not enough membership points", "INSUFFICIENT_POINTS")
		return
	}

	err = h.membershipRepo.UpdateUserTier(c.Request.Context(), userID, input.TierID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to upgrade membership", "INTERNAL_ERROR")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Membership upgraded successfully")
}

func (h *MembershipHandler) GetMyMembership(c *gin.Context) {
	userObj, _ := c.Get("user")
	userModel := userObj.(*models.User)
	userID := userModel.ID

	user, err := h.userRepo.FindByID(userID)
	if err != nil || user == nil {
		utils.SendError(c, http.StatusNotFound, "Người dùng không tồn tại", "USER_NOT_FOUND")
		return
	}

	tierName := "BRONZE"
	currentRequiredPoints := 0
	if user.MembershipTier != nil {
		tierName = user.MembershipTier.Name
		currentRequiredPoints = user.MembershipTier.RequiredPoints
	} else {
		_ = h.membershipRepo.RefreshUserTierByPoints(c.Request.Context(), userID)
		if refreshed, err := h.userRepo.FindByID(userID); err == nil && refreshed != nil && refreshed.MembershipTier != nil {
			user = refreshed
			tierName = refreshed.MembershipTier.Name
			currentRequiredPoints = refreshed.MembershipTier.RequiredPoints
		}
	}

	tiers, err := h.membershipRepo.GetTiers(c.Request.Context())
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to fetch membership tiers", "INTERNAL_ERROR")
		return
	}

	nextTierName := ""
	nextTierPoints := user.MembershipPoints
	for _, tier := range tiers {
		if tier.RequiredPoints > user.MembershipPoints {
			nextTierName = tier.Name
			nextTierPoints = tier.RequiredPoints
			break
		}
	}
	if nextTierName == "" && nextTierPoints < currentRequiredPoints {
		nextTierPoints = currentRequiredPoints
	}

	res := map[string]interface{}{
		"tier":             tierName,
		"points":           user.MembershipPoints,
		"next_tier":        nextTierName,
		"next_tier_points": nextTierPoints,
		"points_to_next":   maxInt(0, nextTierPoints-user.MembershipPoints),
		"joined_at":        user.CreatedAt,
	}

	utils.SendSuccess(c, http.StatusOK, res, "Lấy thông tin hạng thành viên thành công")
}

func maxInt(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
