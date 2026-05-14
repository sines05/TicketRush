package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
	"golang.org/x/oauth2/google"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"

	"github.com/pquerna/otp/totp"
)

type RegisterRequest struct {
	Email       string            `json:"email"`
	Password    string            `json:"password"`
	FullName    string            `json:"full_name"`
	Gender      models.GenderType `json:"gender"`
	DateOfBirth string            `json:"date_of_birth"`
}

type AuthService interface {
	Register(req RegisterRequest) (*models.User, error)
	Login(email, password string) (string, *models.User, bool, error)
	ValidateToken(tokenString string) (*models.User, error)
	ForgotPassword(email string) error
	ResetPassword(token, newPassword string) error
	GoogleLoginURL(state string) string
	GoogleLoginCallback(code string) (string, *models.User, error)
	FacebookLoginURL(state string) string
	FacebookLoginCallback(code string) (string, *models.User, error)
	Generate2FA(userID uuid.UUID) (string, string, error)
	Enable2FA(userID uuid.UUID, code string) error
	Verify2FA(userID uuid.UUID, code string) (string, error)
	UpdateNotificationToken(userID uuid.UUID, token string) error
	UpdateProfile(userID uuid.UUID, fullName string, avatarURL string, gender models.GenderType, dob string) (*models.User, error)
	ChangePassword(userID uuid.UUID, oldPassword string, newPassword string) error
	Disable2FA(userID uuid.UUID, code string) error
}

type authService struct {
	userRepo         repository.UserRepository
	notificationServ NotificationService
	jwtSecret        string
	googleCfg        *oauth2.Config
	facebookCfg      *oauth2.Config
}

func NewAuthService(userRepo repository.UserRepository, notificationServ NotificationService, cfg *config.Config) AuthService {
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
		jwtSecret:        cfg.JWTSecret,
		googleCfg:        googleCfg,
		facebookCfg:      facebookCfg,
	}
}

func (s *authService) Register(req RegisterRequest) (*models.User, error) {
	// Check if user already exists
	_, err := s.userRepo.FindByEmail(req.Email)
	if err == nil {
		return nil, errors.New("email already exists")
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
		Email:        req.Email,
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

func (s *authService) Login(email, password string) (string, *models.User, bool, error) {
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return "", nil, false, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, false, errors.New("invalid email or password")
	}

	if user.TwoFactorEnabled {
		return "", user, true, nil
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    user.Role,
		"exp":     time.Now().UTC().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", nil, false, err
	}

	return tokenString, user, false, nil
}

func (s *authService) ValidateToken(tokenString string) (*models.User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid claims")
	}

	val, ok := claims["user_id"]
	if !ok {
		return nil, errors.New("user_id not found in token")
	}

	var userIDStr string
	switch v := val.(type) {
	case string:
		userIDStr = v
	case float64:
		// Handle legacy tokens if any, though they will likely fail uuid.Parse
		userIDStr = fmt.Sprintf("%.0f", v)
	default:
		return nil, errors.New("invalid user_id type in token")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user_id format in token")
	}

	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *authService) GoogleLoginURL(state string) string {
	return s.googleCfg.AuthCodeURL(state)
}

func (s *authService) GoogleLoginCallback(code string) (string, *models.User, error) {
	// 1. Exchange code for token
	token, err := s.googleCfg.Exchange(context.Background(), code)
	if err != nil {
		return "", nil, fmt.Errorf("code exchange failed: %v", err)
	}

	// 2. Fetch user profile from Google
	client := s.googleCfg.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return "", nil, fmt.Errorf("failed getting user info: %v", err)
	}
	defer resp.Body.Close()

	var userInfo struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return "", nil, fmt.Errorf("failed parsing user info: %v", err)
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
			return "", nil, fmt.Errorf("failed to create oauth user: %v", err)
		}
		// Trigger Welcome Email for new OAuth user
		s.notificationServ.NotifyWelcome(user)
	}

	// 2FA check for social login
	if user.TwoFactorEnabled {
		return "", user, nil
	}

	// 4. Generate JWT
	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    user.Role,
		"exp":     time.Now().UTC().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := jwtToken.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", nil, err
	}

	return tokenString, user, nil
}

func (s *authService) ForgotPassword(email string) error {
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return errors.New("user not found")
	}

	// Create a reset token
	resetToken := uuid.New().String()

	reset := &models.PasswordReset{
		UserID:    user.ID,
		Token:     resetToken,
		ExpiresAt: time.Now().UTC().Add(15 * time.Minute),
	}

	if err := s.userRepo.CreatePasswordReset(reset); err != nil {
		return err
	}

	return nil
}

func (s *authService) ResetPassword(token, newPassword string) error {
	reset, err := s.userRepo.FindPasswordResetByToken(token)
	if err != nil {
		return errors.New("invalid or expired token")
	}

	if time.Now().UTC().After(reset.ExpiresAt) {
		s.userRepo.DeletePasswordReset(token)
		return errors.New("token has expired")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.userRepo.UpdatePassword(reset.UserID, string(hashedPassword)); err != nil {
		return err
	}

	// Delete the token so it can't be reused
	s.userRepo.DeletePasswordReset(token)

	return nil
}

func (s *authService) FacebookLoginURL(state string) string {
	return s.facebookCfg.AuthCodeURL(state)
}

func (s *authService) FacebookLoginCallback(code string) (string, *models.User, error) {
	token, err := s.facebookCfg.Exchange(context.Background(), code)
	if err != nil {
		return "", nil, fmt.Errorf("facebook code exchange failed: %v", err)
	}

	client := s.facebookCfg.Client(context.Background(), token)
	resp, err := client.Get("https://graph.facebook.com/me?fields=id,name,email")
	if err != nil {
		return "", nil, fmt.Errorf("failed getting facebook user info: %v", err)
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return "", nil, fmt.Errorf("failed parsing facebook user info: %v", err)
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
			return "", nil, fmt.Errorf("failed to create facebook oauth user: %v", err)
		}
		// Trigger Welcome Email for new OAuth user
		s.notificationServ.NotifyWelcome(user)
	}

	// 2FA check for social login
	if user.TwoFactorEnabled {
		return "", user, nil
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    user.Role,
		"exp":     time.Now().UTC().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := jwtToken.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", nil, err
	}

	return tokenString, user, nil
}

func (s *authService) Generate2FA(userID uuid.UUID) (string, string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", "", err
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "TicketRush",
		AccountName: user.Email,
	})
	if err != nil {
		return "", "", err
	}

	// Store secret temporarily but not enabled yet
	if err := s.userRepo.Update2FA(userID, false, key.Secret()); err != nil {
		return "", "", err
	}

	return key.Secret(), key.URL(), nil
}

func (s *authService) Enable2FA(userID uuid.UUID, code string) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	valid := totp.Validate(code, user.TwoFactorSecret)
	if !valid {
		return errors.New("invalid verification code")
	}

	return s.userRepo.Update2FA(userID, true, user.TwoFactorSecret)
}

func (s *authService) Verify2FA(userID uuid.UUID, code string) (string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", err
	}

	valid := totp.Validate(code, user.TwoFactorSecret)
	if !valid {
		return "", errors.New("invalid verification code")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    user.Role,
		"exp":     time.Now().UTC().Add(time.Hour * 24).Unix(),
	})

	return token.SignedString([]byte(s.jwtSecret))
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

	valid := totp.Validate(code, user.TwoFactorSecret)
	if !valid {
		return errors.New("invalid verification code")
	}

	if err := s.userRepo.Update2FA(userID, false, ""); err != nil {
		return err
	}

	s.notificationServ.NotifySecurityEvent(user, "Two-Factor Authentication Disabled")
	return nil
}
