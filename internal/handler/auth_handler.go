package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"ticketrush/internal/models"
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
		if err.Error() == "email already exists" {
			utils.SendError(c, http.StatusConflict, "Email already exists", "EMAIL_EXISTS")
			return
		}
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

	token, user, requires2FA, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, err.Error(), "LOGIN_FAILED")
		return
	}

	if requires2FA {
		utils.SendSuccess(c, http.StatusOK, gin.H{
			"requires_2fa": true,
			"user_id":      user.ID,
		}, "Vui lòng nhập mã xác thực 2 lớp")
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
	state := uuid.New().String()
	c.SetCookie("oauth_state", state, 3600, "/", "", false, true)
	url := h.authService.GoogleLoginURL(state)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	state := c.Query("state")
	cookieState, err := c.Cookie("oauth_state")
	if err != nil || state != cookieState {
		utils.SendError(c, http.StatusBadRequest, "Invalid state parameter", "INVALID_STATE")
		return
	}
	// Clear the cookie
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

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

	if token == "" && user != nil {
		c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173/auth/2fa?user_id="+user.ID.String())
		return
	}

	c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173/auth/callback?token="+token)
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

func (h *AuthHandler) FacebookLogin(c *gin.Context) {
	state := uuid.New().String()
	c.SetCookie("oauth_state", state, 3600, "/", "", false, true)
	url := h.authService.FacebookLoginURL(state)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func (h *AuthHandler) FacebookCallback(c *gin.Context) {
	state := c.Query("state")
	cookieState, err := c.Cookie("oauth_state")
	if err != nil || state != cookieState {
		utils.SendError(c, http.StatusBadRequest, "Invalid state parameter", "INVALID_STATE")
		return
	}
	// Clear the cookie
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

	code := c.Query("code")
	if code == "" {
		utils.SendError(c, http.StatusBadRequest, "Missing code in callback", "INVALID_INPUT")
		return
	}

	token, user, err := h.authService.FacebookLoginCallback(code)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, err.Error(), "FACEBOOK_LOGIN_FAILED")
		return
	}

	if token == "" && user != nil {
		// Handle 2FA redirect if needed, but for now let's stick to the token redirect
		// If 2FA is required, we might need a different frontend route
		c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173/auth/2fa?user_id="+user.ID.String())
		return
	}

	c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173/auth/callback?token="+token)
}

func (h *AuthHandler) Setup2FA(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	secret, qrURL, err := h.authService.Generate2FA(u.ID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Could not generate 2FA", "2FA_SETUP_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"secret": secret,
		"qr_url": qrURL,
	}, "Cấu hình 2FA thành công")
}

type verify2FARequest struct {
	Code string `json:"code" binding:"required"`
}

func (h *AuthHandler) Enable2FA(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	var req verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	err := h.authService.Enable2FA(u.ID, req.Code)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_CODE")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Đã kích hoạt bảo mật 2 lớp")
}

type login2FARequest struct {
	UserID string `json:"user_id" binding:"required"`
	Code   string `json:"code" binding:"required"`
}

func (h *AuthHandler) Verify2FALogin(c *gin.Context) {
	var req login2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "Invalid User ID", "INVALID_INPUT")
		return
	}

	token, err := h.authService.Verify2FA(userID, req.Code)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, err.Error(), "INVALID_CODE")
		return
	}

	user, _ := h.authService.ValidateToken(token)

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"user_id":      user.ID,
		"full_name":     user.FullName,
		"role":         user.Role,
		"access_token": token,
	}, "Xác thực thành công")
}

func (h *AuthHandler) UpdateNotificationToken(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	err := h.authService.UpdateNotificationToken(u.ID, req.Token)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Could not update token", "UPDATE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Đã cập nhật token thông báo")
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		utils.SendError(c, http.StatusUnauthorized, "User not found in context", "UNAUTHORIZED")
		return
	}

	u := user.(*models.User)
	utils.SendSuccess(c, http.StatusOK, gin.H{
		"id":            u.ID,
		"email":         u.Email,
		"full_name":     u.FullName,
		"role":          u.Role,
		"gender":        u.Gender,
		"date_of_birth": u.DateOfBirth,
		"is_oauth":      u.IsOAuth,
	}, "")
}
