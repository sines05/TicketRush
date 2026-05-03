package handler

import (
	"net/http"
	"strings"
	"time"

	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userRepo repository.UserRepository
}

func NewUserHandler(userRepo repository.UserRepository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

type updateMeRequest struct {
	FullName  *string `json:"full_name" binding:"omitempty,min=1,max=100"`
	AvatarURL *string `json:"avatar_url" binding:"omitempty,max=255"`
	Gender    *string `json:"gender" binding:"omitempty"`
	DOB       *string `json:"date_of_birth" binding:"omitempty"`
}

func (h *UserHandler) GetMe(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"user_id":       u.ID,
		"email":         u.Email,
		"full_name":     u.FullName,
		"role":          u.Role,
		"gender":        u.Gender,
		"date_of_birth": u.DateOfBirth,
		"avatar_url":    u.AvatarURL,
	}, "Thành công")
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	var req updateMeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	if req.FullName != nil {
		trimmed := strings.TrimSpace(*req.FullName)
		if trimmed == "" {
			utils.SendError(c, http.StatusBadRequest, "full_name không được để trống", "INVALID_INPUT")
			return
		}
		req.FullName = &trimmed
	}

	if req.AvatarURL != nil {
		trimmed := strings.TrimSpace(*req.AvatarURL)
		req.AvatarURL = &trimmed
	}

	var gender *models.GenderType
	if req.Gender != nil {
		trimmed := strings.TrimSpace(*req.Gender)
		if trimmed == "" {
			utils.SendError(c, http.StatusBadRequest, "gender không được để trống", "INVALID_INPUT")
			return
		}
		switch trimmed {
		case string(models.GenderMale), string(models.GenderFemale), string(models.GenderOther):
			gt := models.GenderType(trimmed)
			gender = &gt
		default:
			utils.SendError(c, http.StatusBadRequest, "gender không hợp lệ", "INVALID_INPUT")
			return
		}
	}

	var dob *time.Time
	if req.DOB != nil {
		trimmed := strings.TrimSpace(*req.DOB)
		if trimmed == "" {
			utils.SendError(c, http.StatusBadRequest, "date_of_birth không được để trống", "INVALID_INPUT")
			return
		}
		parsed, err := time.Parse("2006-01-02", trimmed)
		if err != nil {
			utils.SendError(c, http.StatusBadRequest, "date_of_birth không đúng định dạng (YYYY-MM-DD)", "INVALID_INPUT")
			return
		}
		dob = &parsed
	}

	updated, err := h.userRepo.UpdateProfile(u.ID, req.FullName, req.AvatarURL, gender, dob)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "UPDATE_PROFILE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"user_id":       updated.ID,
		"email":         updated.Email,
		"full_name":     updated.FullName,
		"role":          updated.Role,
		"gender":        updated.Gender,
		"date_of_birth": updated.DateOfBirth,
		"avatar_url":    updated.AvatarURL,
	}, "Cập nhật hồ sơ thành công")
}
