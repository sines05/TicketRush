package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
	"golang.org/x/oauth2/google"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils/encryption"

	"github.com/pquerna/otp/totp"
)

type RegisterRequest struct {
	Email       string            `json:"email" binding:"required,email"`
	Password    string            `json:"password" binding:"required,min=8"`
	FullName    string            `json:"full_name" binding:"required"`
	Gender      models.GenderType `json:"gender" binding:"required"`
	DateOfBirth string            `json:"date_of_birth" binding:"required"`
}

type AuthService interface {
	Register(req RegisterRequest) (*models.User, error)
	Login(email, password string) (string, string, string, *models.User, bool, error)
	ValidateToken(tokenString string) (*models.User, bool, error)
	RefreshToken(oldRefreshToken string) (string, string, error)
	Logout(refreshToken string) error
	ForgotPassword(email string) error
	ResetPassword(token, newPassword string) error
	GoogleLoginURL(state string) string
	GoogleLoginCallback(code string) (string, string, string, *models.User, error)
	FacebookLoginURL(state string) string
	FacebookLoginCallback(code string) (string, string, string, *models.User, error)
	Generate2FA(userID uuid.UUID) (string, string, []string, error)
	Enable2FA(userID uuid.UUID, code string) error
	Verify2FA(userID uuid.UUID, code string) (string, string, error)
	UpdateNotificationToken(userID uuid.UUID, token string) error
	UpdateProfile(userID uuid.UUID, fullName string, avatarURL string, gender models.GenderType, dob string) (*models.User, error)
	ChangePassword(userID uuid.UUID, oldPassword string, newPassword string) error
	Disable2FA(userID uuid.UUID, code string) error
	Generate2FAPendingToken(userID uuid.UUID) (string, error)
	Validate2FAPendingToken(token string) (uuid.UUID, error)
}

type authService struct {
	userRepo         repository.UserRepository
	notificationServ NotificationService
	redis            *redis.Client
	jwtSecret        string
	googleCfg        *oauth2.Config
	facebookCfg      *oauth2.Config
	encryptionKey    []byte
	cfg              *config.Config
}

var (
	ErrPasswordTooShort = errors.New("password must be at least 8 characters long")
	ErrPasswordWeak     = errors.New("password must contain at least one letter and one number")
)

func validatePassword(password string) error {
	if len(password) < 8 {
		return ErrPasswordTooShort
	}
	// Check for at least one letter and one number
	hasLetter := regexp.MustCompile(`[a-zA-Z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	if !hasLetter || !hasNumber {
		return ErrPasswordWeak
	}
	return nil
}

func (s *authService) decrypt2FASecret(encryptedSecret string) (string, error) {
	if encryptedSecret == "" {
		return "", nil
	}
	return encryption.DecryptAES(encryptedSecret, s.encryptionKey)
}

func NewAuthService(userRepo repository.UserRepository, notificationServ NotificationService, rdb *redis.Client, cfg *config.Config) AuthService {
	googleCfg := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	facebookCfg := &oauth2.Config{
		ClientID:     cfg.FacebookClientID,
		ClientSecret: cfg.FacebookClientSecret,
		RedirectURL:  cfg.FacebookRedirectURL,
		Scopes:       []string{"email", "public_profile"},
		Endpoint:     facebook.Endpoint,
	}

	return &authService{
		userRepo:         userRepo,
		notificationServ: notificationServ,
		redis:            rdb,
		jwtSecret:        cfg.JWTSecret,
		googleCfg:        googleCfg,
		facebookCfg:      facebookCfg,
		encryptionKey:    []byte(cfg.EncryptionMasterKey),
		cfg:              cfg,
	}
}

func (s *authService) Register(req RegisterRequest) (*models.User, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	// Check if user already exists
	_, err := s.userRepo.FindByEmail(email)
	if err == nil {
		return nil, errors.New("email already exists")
	}

	if err := validatePassword(req.Password); err != nil {
		return nil, err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	var dob time.Time
	dob, err = time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		dob, err = time.Parse(time.RFC3339, req.DateOfBirth)
		if err != nil {
			return nil, errors.New("invalid date_of_birth format, use YYYY-MM-DD or RFC3339")
		}
	}

	user := &models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		FullName:     req.FullName,
		Gender:       req.Gender,
		DateOfBirth:  dob,
		Role:         models.RoleCustomer,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Trigger Welcome Email
	s.notificationServ.NotifyWelcome(user)

	return user, nil
}

func (s *authService) Login(email, password string) (string, string, string, *models.User, bool, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return "", "", "", nil, false, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", "", "", nil, false, errors.New("invalid email or password")
	}

	if user.TwoFactorEnabled {
		pendingToken, err := s.Generate2FAPendingToken(user.ID)
		if err != nil {
			return "", "", "", nil, false, err
		}
		return "", "", pendingToken, user, true, nil
	}

	accessToken, refreshToken, err := s.generateTokenPair(user.ID, user.Role, true)
	if err != nil {
		return "", "", "", nil, false, err
	}

	return accessToken, refreshToken, "", user, false, nil
}

func (s *authService) generateTokenPair(userID uuid.UUID, role models.UserRole, is2FAVerified bool) (string, string, error) {
	// Access Token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":      userID.String(),
		"role":         role,
		"2fa_verified": is2FAVerified,
		"exp":          time.Now().UTC().Add(time.Hour).Unix(), // 1 hour
	})

	accessToken, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", "", err
	}

	// Refresh Token
	refreshToken := uuid.New().String()
	if s.redis != nil {
		data, _ := json.Marshal(map[string]interface{}{
			"user_id":      userID.String(),
			"2fa_verified": is2FAVerified,
		})
		err = s.redis.Set(context.Background(), fmt.Sprintf("RT:%s", refreshToken), data, 7*24*time.Hour).Err()
		if err != nil {
			return "", "", err
		}
	}

	return accessToken, refreshToken, nil
}

func (s *authService) RefreshToken(oldRefreshToken string) (string, string, error) {
	if s.redis == nil {
		return "", "", errors.New("redis client not initialized")
	}
	ctx := context.Background()
	key := fmt.Sprintf("RT:%s", oldRefreshToken)

	val, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return "", "", errors.New("invalid or expired refresh token")
	}

	var userID uuid.UUID
	var is2FAVerified bool
	var parseErr error

	// Try to parse as JSON
	var data struct {
		UserID        string `json:"user_id"`
		Is2FAVerified bool   `json:"2fa_verified"`
	}
	if err := json.Unmarshal([]byte(val), &data); err == nil {
		userID, parseErr = uuid.Parse(data.UserID)
		is2FAVerified = data.Is2FAVerified
	} else {
		// Fallback for old format (just userID string)
		userID, parseErr = uuid.Parse(val)
		is2FAVerified = false // Default to false for security
	}

	if parseErr != nil {
		return "", "", errors.New("invalid user_id in refresh token")
	}

	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", "", errors.New("user not found")
	}

	// Token Rotation: Delete old token
	s.redis.Del(ctx, key)

	// Derive 2fa_verified: true if it was verified in RT OR if user has 2FA disabled now
	final2FAVerified := is2FAVerified || !user.TwoFactorEnabled

	// Generate new pair
	return s.generateTokenPair(user.ID, user.Role, final2FAVerified)
}

func (s *authService) Logout(refreshToken string) error {
	if refreshToken == "" || s.redis == nil {
		return nil
	}
	return s.redis.Del(context.Background(), fmt.Sprintf("RT:%s", refreshToken)).Err()
}

func (s *authService) ValidateToken(tokenString string) (*models.User, bool, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, false, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, false, errors.New("invalid claims")
	}

	val, ok := claims["user_id"]
	if !ok {
		return nil, false, errors.New("user_id not found in token")
	}

	is2FAVerified := false
	if v, ok := claims["2fa_verified"].(bool); ok {
		is2FAVerified = v
	}

	var userIDStr string
	switch v := val.(type) {
	case string:
		userIDStr = v
	case float64:
		// Handle legacy tokens if any, though they will likely fail uuid.Parse
		userIDStr = fmt.Sprintf("%.0f", v)
	default:
		return nil, false, errors.New("invalid user_id type in token")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, false, errors.New("invalid user_id format in token")
	}

	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, false, err
	}

	return user, is2FAVerified, nil
}

func (s *authService) GoogleLoginURL(state string) string {
	return s.googleCfg.AuthCodeURL(state)
}

func (s *authService) GoogleLoginCallback(code string) (string, string, string, *models.User, error) {
	// 1. Exchange code for token
	token, err := s.googleCfg.Exchange(context.Background(), code)
	if err != nil {
		return "", "", "", nil, fmt.Errorf("code exchange failed: %v", err)
	}

	// 2. Fetch user profile from Google
	client := s.googleCfg.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return "", "", "", nil, fmt.Errorf("failed getting user info: %v", err)
	}
	defer resp.Body.Close()

	var userInfo struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return "", "", "", nil, fmt.Errorf("failed parsing user info: %v", err)
	}

	// 3. Find or Create User
	user, err := s.userRepo.FindByEmail(userInfo.Email)
	if err != nil {
		// Create new user
		user = &models.User{
			Email:        userInfo.Email,
			PasswordHash: "", // No password for oauth users
			IsOAuth:      true,
			FullName:     userInfo.Name,
			Role:         models.RoleCustomer,
			Gender:       models.GenderOther, // Default or prompt later
			DateOfBirth:  time.Now().UTC(),   // Default or prompt later
		}
		if err := s.userRepo.Create(user); err != nil {
			return "", "", "", nil, fmt.Errorf("failed to create oauth user: %v", err)
		}
		// Trigger Welcome Email for new OAuth user
		s.notificationServ.NotifyWelcome(user)
	}

	// 2FA check for social login
	if user.TwoFactorEnabled {
		pendingToken, err := s.Generate2FAPendingToken(user.ID)
		if err != nil {
			return "", "", "", nil, err
		}
		return "", "", pendingToken, user, nil
	}

	// 4. Generate Token Pair
	accessToken, refreshToken, err := s.generateTokenPair(user.ID, user.Role, true)
	if err != nil {
		return "", "", "", nil, err
	}

	return accessToken, refreshToken, "", user, nil
}

func (s *authService) ForgotPassword(email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return errors.New("user not found")
	}

	// Create a reset token
	resetToken := uuid.New().String()

	// Hash the token for storage
	hash := sha256.Sum256([]byte(resetToken))
	hashedToken := hex.EncodeToString(hash[:])

	reset := &models.PasswordReset{
		UserID:    user.ID,
		Token:     hashedToken,
		ExpiresAt: time.Now().UTC().Add(15 * time.Minute),
	}

	if err := s.userRepo.CreatePasswordReset(reset); err != nil {
		return err
	}

	// Send real email with resetURL
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.cfg.FrontendURL, resetToken)
	s.notificationServ.NotifyPasswordReset(user, resetURL)

	return nil
}

func (s *authService) ResetPassword(token, newPassword string) error {
	// Hash the incoming token to compare with the stored hashed token
	hash := sha256.Sum256([]byte(token))
	hashedToken := hex.EncodeToString(hash[:])

	reset, err := s.userRepo.FindPasswordResetByToken(hashedToken)
	if err != nil {
		return errors.New("invalid or expired token")
	}

	if time.Now().UTC().After(reset.ExpiresAt) {
		s.userRepo.DeletePasswordReset(hashedToken)
		return errors.New("token has expired")
	}

	if err := validatePassword(newPassword); err != nil {
		return err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.userRepo.UpdatePassword(reset.UserID, string(hashedPassword)); err != nil {
		return err
	}

	// Delete the token so it can't be reused
	s.userRepo.DeletePasswordReset(hashedToken)

	return nil
}

func (s *authService) FacebookLoginURL(state string) string {
	return s.facebookCfg.AuthCodeURL(state)
}

func (s *authService) FacebookLoginCallback(code string) (string, string, string, *models.User, error) {
	token, err := s.facebookCfg.Exchange(context.Background(), code)
	if err != nil {
		return "", "", "", nil, fmt.Errorf("facebook code exchange failed: %v", err)
	}

	client := s.facebookCfg.Client(context.Background(), token)
	resp, err := client.Get("https://graph.facebook.com/me?fields=id,name,email")
	if err != nil {
		return "", "", "", nil, fmt.Errorf("failed getting facebook user info: %v", err)
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return "", "", "", nil, fmt.Errorf("failed parsing facebook user info: %v", err)
	}

	user, err := s.userRepo.FindByEmail(userInfo.Email)
	if err != nil {
		user = &models.User{
			Email:        userInfo.Email,
			PasswordHash: "",
			IsOAuth:      true,
			FullName:     userInfo.Name,
			Role:         models.RoleCustomer,
			Gender:       models.GenderOther,
			DateOfBirth:  time.Now().UTC(),
		}
		if err := s.userRepo.Create(user); err != nil {
			return "", "", "", nil, fmt.Errorf("failed to create facebook oauth user: %v", err)
		}
		// Trigger Welcome Email for new OAuth user
		s.notificationServ.NotifyWelcome(user)
	}

	// 2FA check for social login
	if user.TwoFactorEnabled {
		pendingToken, err := s.Generate2FAPendingToken(user.ID)
		if err != nil {
			return "", "", "", nil, err
		}
		return "", "", pendingToken, user, nil
	}

	accessToken, refreshToken, err := s.generateTokenPair(user.ID, user.Role, true)
	if err != nil {
		return "", "", "", nil, err
	}

	return accessToken, refreshToken, "", user, nil
}

func (s *authService) Generate2FA(userID uuid.UUID) (string, string, []string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", "", nil, err
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "TicketRush",
		AccountName: user.Email,
	})
	if err != nil {
		return "", "", nil, err
	}

	encryptedSecret, err := encryption.EncryptAES(key.Secret(), s.encryptionKey)
	if err != nil {
		return "", "", nil, err
	}

	// Generate 10 recovery codes
	codes := make([]string, 10)
	hashedCodes := make([]string, 10)
	for i := 0; i < 10; i++ {
		code := uuid.New().String()[:8]
		codes[i] = code
		hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
		if err != nil {
			return "", "", nil, err
		}
		hashedCodes[i] = string(hash)
	}
	recoveryCodesJSON, _ := json.Marshal(hashedCodes)

	// Store secret temporarily in PendingTwoFactorSecret and hashed recovery codes
	if err := s.userRepo.Update2FAPending(userID, encryptedSecret, string(recoveryCodesJSON)); err != nil {
		return "", "", nil, err
	}

	return key.Secret(), key.URL(), codes, nil
}

func (s *authService) Enable2FA(userID uuid.UUID, code string) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	if user.PendingTwoFactorSecret == "" {
		return errors.New("2FA setup not initiated")
	}

	secret, err := s.decrypt2FASecret(user.PendingTwoFactorSecret)
	if err != nil {
		return err
	}

	valid := totp.Validate(code, secret)
	if !valid {
		return errors.New("invalid verification code")
	}

	return s.userRepo.Update2FA(userID, true, user.PendingTwoFactorSecret, user.RecoveryCodes)
}

func (s *authService) Verify2FA(userID uuid.UUID, code string) (string, string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", "", err
	}

	if !user.TwoFactorEnabled {
		return "", "", errors.New("2FA is not enabled")
	}

	verified := false

	// Try TOTP
	secret, err := s.decrypt2FASecret(user.TwoFactorSecret)
	if err == nil && secret != "" {
		if totp.Validate(code, secret) {
			verified = true
		}
	}

	// Try Recovery Codes if not verified by TOTP
	if !verified && user.RecoveryCodes != "" {
		var hashedCodes []string
		if err := json.Unmarshal([]byte(user.RecoveryCodes), &hashedCodes); err == nil {
			for i, hashedCode := range hashedCodes {
				if bcrypt.CompareHashAndPassword([]byte(hashedCode), []byte(code)) == nil {
					verified = true
					// Remove used recovery code
					hashedCodes = append(hashedCodes[:i], hashedCodes[i+1:]...)
					newCodesJSON, _ := json.Marshal(hashedCodes)
					s.userRepo.Update2FA(userID, true, user.TwoFactorSecret, string(newCodesJSON))
					break
				}
			}
		}
	}

	if !verified {
		return "", "", errors.New("invalid verification code or recovery code")
	}

	return s.generateTokenPair(user.ID, user.Role, true)
}

func (s *authService) UpdateNotificationToken(userID uuid.UUID, token string) error {
	return s.userRepo.UpdateNotificationToken(userID, token)
}

func (s *authService) UpdateProfile(userID uuid.UUID, fullName string, avatarURL string, gender models.GenderType, dob string) (*models.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	var parsedDOB time.Time
	parsedDOB, err = time.Parse("2006-01-02", dob)
	if err != nil {
		parsedDOB, err = time.Parse(time.RFC3339, dob)
		if err != nil {
			return nil, errors.New("invalid date_of_birth format, use YYYY-MM-DD or RFC3339")
		}
	}

	user.FullName = fullName
	user.AvatarURL = avatarURL
	user.Gender = gender
	user.DateOfBirth = parsedDOB

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *authService) ChangePassword(userID uuid.UUID, oldPassword string, newPassword string) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	if user.IsOAuth && user.PasswordHash == "" {
		return errors.New("cannot change password for OAuth account without password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return errors.New("invalid old password")
	}

	if err := validatePassword(newPassword); err != nil {
		return err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return s.userRepo.UpdatePassword(userID, string(hashedPassword))
}

func (s *authService) Disable2FA(userID uuid.UUID, code string) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	if !user.TwoFactorEnabled {
		return errors.New("2FA is not enabled")
	}

	secret, err := s.decrypt2FASecret(user.TwoFactorSecret)
	if err != nil {
		return err
	}

	valid := totp.Validate(code, secret)
	if !valid {
		return errors.New("invalid verification code")
	}

	if err := s.userRepo.Update2FA(userID, false, "", ""); err != nil {
		return err
	}

	s.notificationServ.NotifySecurityEvent(user, "Two-Factor Authentication Disabled")
	return nil
}

func (s *authService) Generate2FAPendingToken(userID uuid.UUID) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID.String(),
		"intent":  "2fa_login",
		"exp":     time.Now().UTC().Add(5 * time.Minute).Unix(),
	})

	return token.SignedString([]byte(s.jwtSecret))
}

func (s *authService) Validate2FAPendingToken(tokenString string) (uuid.UUID, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return uuid.Nil, errors.New("invalid or expired 2FA pending token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil, errors.New("invalid claims")
	}

	if claims["intent"] != "2fa_login" {
		return uuid.Nil, errors.New("invalid token intent")
	}

	userIDStr, ok := claims["user_id"].(string)
	if !ok {
		return uuid.Nil, errors.New("user_id not found in token")
	}

	return uuid.Parse(userIDStr)
}

