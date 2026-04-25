package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
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

	utils.SendSuccess(c, http.StatusCreated, nil, "Đăng ký thành công")
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
		"full_name":     user.FullName,
		"role":         user.Role,
		"access_token": token,
	}, "Đăng nhập thành công")
}

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	url := h.authService.GoogleLoginURL()
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		utils.SendError(c, http.StatusBadRequest, "Missing code in callback", "INVALID_INPUT")
		return
	}

	token, user, err := h.authService.GoogleLoginCallback(code)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, err.Error(), "GOOGLE_LOGIN_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"user_id":      user.ID,
		"full_name":     user.FullName,
		"role":         user.Role,
		"access_token": token,
	}, "Đăng nhập Google thành công")
}

type forgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req forgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	err := h.authService.ForgotPassword(req.Email)
	if err != nil {
		// Even if user not found, don't reveal to prevent email enumeration, but for this project we can
		utils.SendError(c, http.StatusBadRequest, err.Error(), "FORGOT_PASSWORD_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Yêu cầu khôi phục mật khẩu đã được gửi")
}

type resetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	err := h.authService.ResetPassword(req.Token, req.NewPassword)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "RESET_PASSWORD_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Mật khẩu đã được đặt lại thành công")
}
