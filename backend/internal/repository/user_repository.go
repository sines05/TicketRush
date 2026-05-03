package repository

import (
	"strings"
	"ticketrush/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *models.User) error
	FindByEmail(email string) (*models.User, error)
	FindByID(id uuid.UUID) (*models.User, error)
	UpdateProfile(id uuid.UUID, fullName *string, avatarURL *string, gender *models.GenderType, dateOfBirth *time.Time) (*models.User, error)
	SetPasswordResetToken(email string, tokenHash string, expiresAt time.Time) (*models.User, error)
	FindByPasswordResetTokenHash(tokenHash string) (*models.User, error)
	UpdatePassword(id uuid.UUID, passwordHash string) error
	ClearPasswordResetToken(id uuid.UUID) error
}

type userRepo struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *userRepo) FindByEmail(email string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) UpdateProfile(id uuid.UUID, fullName *string, avatarURL *string, gender *models.GenderType, dateOfBirth *time.Time) (*models.User, error) {
	var user models.User
	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if fullName != nil {
		updates["full_name"] = *fullName
	}
	if avatarURL != nil {
		if strings.TrimSpace(*avatarURL) == "" {
			updates["avatar_url"] = nil
		} else {
			updates["avatar_url"] = *avatarURL
		}
	}
	if gender != nil {
		updates["gender"] = *gender
	}
	if dateOfBirth != nil {
		updates["date_of_birth"] = *dateOfBirth
	}

	if len(updates) == 0 {
		return &user, nil
	}

	if err := r.db.Model(&user).Updates(updates).Error; err != nil {
		return nil, err
	}

	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) SetPasswordResetToken(email string, tokenHash string, expiresAt time.Time) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}

	if err := r.db.Model(&user).Updates(map[string]interface{}{
		"password_reset_token_hash": tokenHash,
		"password_reset_expires_at": expiresAt,
	}).Error; err != nil {
		return nil, err
	}

	if err := r.db.First(&user, user.ID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByPasswordResetTokenHash(tokenHash string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("password_reset_token_hash = ?", tokenHash).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) UpdatePassword(id uuid.UUID, passwordHash string) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Update("password_hash", passwordHash).Error
}

func (r *userRepo) ClearPasswordResetToken(id uuid.UUID) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Updates(map[string]interface{}{
		"password_reset_token_hash": nil,
		"password_reset_expires_at": nil,
	}).Error
}
