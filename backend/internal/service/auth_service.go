package service

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
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
	ForgotPassword(email string) (string, time.Time, error)
	ResetPassword(resetToken string, newPassword string) error
}

type authService struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo repository.UserRepository, cfg *config.Config) AuthService {
	return &authService{
		userRepo:  userRepo,
		jwtSecret: cfg.JWTSecret,
	}
}

func (s *authService) Register(req RegisterRequest) (*models.User, error) {
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

func (s *authService) ForgotPassword(email string) (string, time.Time, error) {
	// Do not leak whether the email exists via error messages in the handler.
	// Service returns empty token if user is not found.
	_, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return "", time.Time{}, nil
	}

	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", time.Time{}, err
	}
	resetToken := hex.EncodeToString(buf)

	h := sha256.Sum256([]byte(resetToken))
	tokenHash := hex.EncodeToString(h[:])
	expiresAt := time.Now().Add(15 * time.Minute)

	if _, err := s.userRepo.SetPasswordResetToken(email, tokenHash, expiresAt); err != nil {
		return "", time.Time{}, err
	}

	return resetToken, expiresAt, nil
}

func (s *authService) ResetPassword(resetToken string, newPassword string) error {
	if resetToken == "" || newPassword == "" {
		return errors.New("reset_token and new_password are required")
	}

	h := sha256.Sum256([]byte(resetToken))
	tokenHash := hex.EncodeToString(h[:])

	user, err := s.userRepo.FindByPasswordResetTokenHash(tokenHash)
	if err != nil {
		return errors.New("invalid or expired reset token")
	}

	if user.PasswordResetExpiresAt == nil || time.Now().After(*user.PasswordResetExpiresAt) {
		_ = s.userRepo.ClearPasswordResetToken(user.ID)
		return errors.New("invalid or expired reset token")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.userRepo.UpdatePassword(user.ID, string(hashedPassword)); err != nil {
		return err
	}

	if err := s.userRepo.ClearPasswordResetToken(user.ID); err != nil {
		return err
	}

	return nil
}
