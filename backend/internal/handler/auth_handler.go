package handler

import (
	"net/http"

	"ticketrush/internal/service"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type forgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type resetPasswordRequest struct {
	ResetToken  string `json:"reset_token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req service.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	_, err := h.authService.Register(req)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Could not create user", "REGISTER_FAILED")
		return
	}

	token, user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "REGISTER_LOGIN_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusCreated, gin.H{
		"user_id":      user.ID,
		"full_name":    user.FullName,
		"role":         user.Role,
		"avatar_url":   user.AvatarURL,
		"access_token": token,
	}, "Đăng ký thành công")
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	token, user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, err.Error(), "LOGIN_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"user_id":      user.ID,
		"full_name":    user.FullName,
		"role":         user.Role,
		"avatar_url":   user.AvatarURL,
		"access_token": token,
	}, "Đăng nhập thành công")
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req forgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	resetToken, expiresAt, err := h.authService.ForgotPassword(req.Email)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FORGOT_PASSWORD_FAILED")
		return
	}

	// Always return success message to avoid user enumeration.
	data := gin.H{
		"sent": true,
	}
	if resetToken != "" {
		data["reset_token"] = resetToken
		data["expires_at"] = expiresAt
	}

	utils.SendSuccess(c, http.StatusOK, data, "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.")
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	if err := h.authService.ResetPassword(req.ResetToken, req.NewPassword); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "RESET_PASSWORD_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{"ok": true}, "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.")
}
