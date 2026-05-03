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
	"golang.org/x/oauth2/google"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
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
	Login(email, password string) (string, *models.User, error)
	ValidateToken(tokenString string) (*models.User, error)
	ForgotPassword(email string) error
	ResetPassword(token, newPassword string) error
	GoogleLoginURL() string
	GoogleLoginCallback(code string) (string, *models.User, error)
}

type authService struct {
	userRepo  repository.UserRepository
	jwtSecret string
	googleCfg *oauth2.Config
}

func NewAuthService(userRepo repository.UserRepository, cfg *config.Config) AuthService {
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

	return &authService{
		userRepo:  userRepo,
		jwtSecret: cfg.JWTSecret,
		googleCfg: googleCfg,
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

	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		return nil, errors.New("invalid date_of_birth format, use YYYY-MM-DD")
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

	return user, nil
}

func (s *authService) Login(email, password string) (string, *models.User, error) {
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return "", nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, errors.New("invalid email or password")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", nil, err
	}

	return tokenString, user, nil
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

func (s *authService) GoogleLoginURL() string {
	return s.googleCfg.AuthCodeURL("state") // Note: In production, generate a random state string and verify it
}

func (s *authService) GoogleLoginCallback(code string) (string, *models.User, error) {
	// 1. Exchange code for token
	token, err := s.googleCfg.Exchange(context.Background(), code)
	if err != nil {
		fmt.Printf("ERROR: Google Code Exchange failed: %v\n", err)
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
			PasswordHash: "[OAUTH2_GOOGLE_USER]", // Dummy password for oauth users
			FullName:     userInfo.Name,
			Role:         models.RoleCustomer,
			Gender:       models.GenderOther, // Default or prompt later
			DateOfBirth:  time.Now(),         // Default or prompt later
		}
		if err := s.userRepo.Create(user); err != nil {
			return "", nil, fmt.Errorf("failed to create oauth user: %v", err)
		}
	}

	// 4. Generate JWT
	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
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
		ExpiresAt: time.Now().Add(15 * time.Minute),
	}

	if err := s.userRepo.CreatePasswordReset(reset); err != nil {
		return err
	}

	// In a real application, send this token via Email.
	// For this exercise, we print it to the console.
	fmt.Printf("\n======================================================\n")
	fmt.Printf("PASSWORD RESET TOKEN FOR %s:\n", email)
	fmt.Printf("%s\n", resetToken)
	fmt.Printf("======================================================\n\n")

	return nil
}

func (s *authService) ResetPassword(token, newPassword string) error {
	reset, err := s.userRepo.FindPasswordResetByToken(token)
	if err != nil {
		return errors.New("invalid or expired token")
	}

	if time.Now().After(reset.ExpiresAt) {
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
