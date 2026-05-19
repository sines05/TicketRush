package handler

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"ticketrush/internal/config"
	"ticketrush/internal/dto"
	"ticketrush/internal/models"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
)

type AuthHandler struct {
	authService service.AuthService
	cfg         *config.Config
}

func NewAuthHandler(authService service.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{authService: authService, cfg: cfg}
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req service.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		details := utils.TranslateValidatorError(err)
		utils.SendErrorWithDetails(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT", details)
		return
	}

	user, err := h.authService.Register(req)
	if err != nil {
		if err.Error() == "email already exists" {
			utils.SendError(c, http.StatusConflict, "Email already exists", "EMAIL_EXISTS")
			return
		}
		if err == service.ErrPasswordTooShort || err == service.ErrPasswordWeak {
			utils.SendError(c, http.StatusBadRequest, err.Error(), "WEAK_PASSWORD")
			return
		}
		utils.SendError(c, http.StatusInternalServerError, "Could not create user", "REGISTER_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusCreated, dto.ToUserResponse(*user), "Đăng ký thành công")
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		details := utils.TranslateValidatorError(err)
		utils.SendErrorWithDetails(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT", details)
		return
	}

	accessToken, refreshToken, pendingToken, user, requires2FA, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, "Email hoặc mật khẩu không chính xác", "LOGIN_FAILED")
		return
	}

	if requires2FA {
		utils.SendResponse(c, http.StatusUnauthorized, false, gin.H{
			"requires_2fa":  true,
			"pending_token": pendingToken,
		}, "Vui lòng nhập mã xác thực 2 lớp", "2FA_REQUIRED", nil)
		return
	}

	// Set JWT in HttpOnly cookie
	h.setTokenCookies(c, accessToken, refreshToken)

	utils.SendSuccess(c, http.StatusOK, dto.ToUserResponse(*user), "Đăng nhập thành công")
}

func (h *AuthHandler) setTokenCookies(c *gin.Context, accessToken, refreshToken string) {
	c.SetSameSite(http.SameSiteLaxMode)
	// Access Token: 1 hour
	c.SetCookie("tr_access_token", accessToken, 3600, "/", "", h.cfg.CookieSecure, true)
	// Refresh Token: 7 days
	c.SetCookie("tr_refresh_token", refreshToken, 7*24*3600, "/", "", h.cfg.CookieSecure, true)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	refreshToken, _ := c.Cookie("tr_refresh_token")
	_ = h.authService.Logout(refreshToken)

	c.SetCookie("tr_access_token", "", -1, "/", "", h.cfg.CookieSecure, true)
	c.SetCookie("tr_refresh_token", "", -1, "/", "", h.cfg.CookieSecure, true)
	utils.SendSuccess(c, http.StatusOK, nil, "Đăng xuất thành công")
}

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	state := uuid.New().String()
	c.SetCookie("oauth_state", state, 3600, "/", "", h.cfg.CookieSecure, true)
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
	c.SetCookie("oauth_state", "", -1, "/", "", h.cfg.CookieSecure, true)

	code := c.Query("code")
	if code == "" {
		utils.SendError(c, http.StatusBadRequest, "Missing code in callback", "INVALID_INPUT")
		return
	}

	accessToken, refreshToken, pendingToken, _, err := h.authService.GoogleLoginCallback(code)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, err.Error(), "GOOGLE_LOGIN_FAILED")
		return
	}

	if accessToken == "" && pendingToken != "" {
		c.Redirect(http.StatusTemporaryRedirect, fmt.Sprintf("%s/auth/login?pending_token=%s", h.cfg.FrontendURL, pendingToken))
		return
	}

	// Set JWT in HttpOnly cookie
	h.setTokenCookies(c, accessToken, refreshToken)

	c.Redirect(http.StatusTemporaryRedirect, fmt.Sprintf("%s/auth/callback", h.cfg.FrontendURL))
}

type forgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req forgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		details := utils.TranslateValidatorError(err)
		utils.SendErrorWithDetails(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT", details)
		return
	}

	// Always return success to prevent email enumeration
	errReq := h.authService.ForgotPassword(req.Email)
	if errReq != nil {
		log.Printf("[DEBUG] ForgotPassword error for %s: %v", req.Email, errReq)
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Yêu cầu khôi phục mật khẩu đã được gửi")
}

type resetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		details := utils.TranslateValidatorError(err)
		utils.SendErrorWithDetails(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT", details)
		return
	}

	err := h.authService.ResetPassword(req.Token, req.NewPassword)
	if err != nil {
		if err == service.ErrPasswordTooShort || err == service.ErrPasswordWeak {
			utils.SendError(c, http.StatusBadRequest, err.Error(), "WEAK_PASSWORD")
			return
		}
		utils.SendError(c, http.StatusBadRequest, err.Error(), "RESET_PASSWORD_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Mật khẩu đã được đặt lại thành công")
}

func (h *AuthHandler) FacebookLogin(c *gin.Context) {
	state := uuid.New().String()
	c.SetCookie("oauth_state", state, 3600, "/", "", h.cfg.CookieSecure, true)
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
	c.SetCookie("oauth_state", "", -1, "/", "", h.cfg.CookieSecure, true)

	code := c.Query("code")
	if code == "" {
		utils.SendError(c, http.StatusBadRequest, "Missing code in callback", "INVALID_INPUT")
		return
	}

	accessToken, refreshToken, pendingToken, _, err := h.authService.FacebookLoginCallback(code)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, err.Error(), "FACEBOOK_LOGIN_FAILED")
		return
	}

	if accessToken == "" && pendingToken != "" {
		c.Redirect(http.StatusTemporaryRedirect, fmt.Sprintf("%s/auth/login?pending_token=%s", h.cfg.FrontendURL, pendingToken))
		return
	}

	// Set JWT in HttpOnly cookie
	h.setTokenCookies(c, accessToken, refreshToken)

	c.Redirect(http.StatusTemporaryRedirect, fmt.Sprintf("%s/auth/callback", h.cfg.FrontendURL))
}

func (h *AuthHandler) Setup2FA(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	if u.TwoFactorEnabled {
		utils.SendError(c, http.StatusBadRequest, "2FA is already enabled", "2FA_ALREADY_ENABLED")
		return
	}

	secret, qrURL, recoveryCodes, err := h.authService.Generate2FA(u.ID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Could not generate 2FA", "2FA_SETUP_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"secret":         secret,
		"qr_url":         qrURL,
		"recovery_codes": recoveryCodes,
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
		details := utils.TranslateValidatorError(err)
		utils.SendErrorWithDetails(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT", details)
		return
	}

	err := h.authService.Enable2FA(u.ID, req.Code)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_CODE")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Đã kích hoạt bảo mật 2 lớp")
}

func (h *AuthHandler) Disable2FA(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		details := utils.TranslateValidatorError(err)
		utils.SendErrorWithDetails(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT", details)
		return
	}

	err := h.authService.Disable2FA(u.ID, req.Code)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "2FA_DISABLE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Đã tắt bảo mật 2 lớp")
}

type login2FARequest struct {
	PendingToken string `json:"pending_token" binding:"required"`
	Code         string `json:"code" binding:"required"`
}

func (h *AuthHandler) Verify2FALogin(c *gin.Context) {
	var req login2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		details := utils.TranslateValidatorError(err)
		utils.SendErrorWithDetails(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT", details)
		return
	}

	userID, err := h.authService.Validate2FAPendingToken(req.PendingToken)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, "Phiên đăng nhập đã hết hạn", "TOKEN_EXPIRED")
		return
	}

	accessToken, refreshToken, err := h.authService.Verify2FA(userID, req.Code)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, "Mã xác thực không chính xác hoặc đã hết hạn", "INVALID_CODE")
		return
	}

	user, _, _ := h.authService.ValidateToken(accessToken)

	// Set JWT in HttpOnly cookie
	h.setTokenCookies(c, accessToken, refreshToken)

	utils.SendSuccess(c, http.StatusOK, dto.ToUserResponse(*user), "Xác thực thành công")
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	refreshToken, err := c.Cookie("tr_refresh_token")
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, "Refresh token missing", "REFRESH_TOKEN_MISSING")
		return
	}

	accessToken, newRefreshToken, err := h.authService.RefreshToken(refreshToken)
	if err != nil {
		utils.SendError(c, http.StatusUnauthorized, err.Error(), "REFRESH_FAILED")
		return
	}

	h.setTokenCookies(c, accessToken, newRefreshToken)
	utils.SendSuccess(c, http.StatusOK, nil, "Token refreshed")
}

func (h *AuthHandler) UpdateNotificationToken(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		details := utils.TranslateValidatorError(err)
		utils.SendErrorWithDetails(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT", details)
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
	utils.SendSuccess(c, http.StatusOK, dto.ToUserResponse(*u), "")
}

type updateMeRequest struct {
	FullName    string            `json:"full_name" binding:"required"`
	AvatarURL   string            `json:"avatar_url"`
	Gender      models.GenderType `json:"gender" binding:"required"`
	DateOfBirth string            `json:"date_of_birth" binding:"required"`
}

func (h *AuthHandler) UpdateMe(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		utils.SendError(c, http.StatusUnauthorized, "User not found in context", "UNAUTHORIZED")
		return
	}
	u := user.(*models.User)

	var req updateMeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		details := utils.TranslateValidatorError(err)
		utils.SendErrorWithDetails(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT", details)
		return
	}

	updatedUser, err := h.authService.UpdateProfile(u.ID, req.FullName, req.AvatarURL, req.Gender, req.DateOfBirth)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "UPDATE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToUserResponse(*updatedUser), "Cập nhật thông tin thành công")
}

type changePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		utils.SendError(c, http.StatusUnauthorized, "User not found in context", "UNAUTHORIZED")
		return
	}
	u := user.(*models.User)

	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		details := utils.TranslateValidatorError(err)
		utils.SendErrorWithDetails(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT", details)
		return
	}

	err := h.authService.ChangePassword(u.ID, req.OldPassword, req.NewPassword)
	if err != nil {
		if err == service.ErrPasswordTooShort || err == service.ErrPasswordWeak {
			utils.SendError(c, http.StatusBadRequest, err.Error(), "WEAK_PASSWORD")
			return
		}
		utils.SendError(c, http.StatusBadRequest, err.Error(), "CHANGE_PASSWORD_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Đổi mật khẩu thành công")
}
