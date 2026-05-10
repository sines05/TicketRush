package repository

import (
	"ticketrush/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *models.User) error
	FindByEmail(email string) (*models.User, error)
	FindByID(id uuid.UUID) (*models.User, error)
	Update(user *models.User) error
	UpdatePassword(userID uuid.UUID, newPasswordHash string) error
	CreatePasswordReset(reset *models.PasswordReset) error
	FindPasswordResetByToken(token string) (*models.PasswordReset, error)
	DeletePasswordReset(token string) error
	Update2FA(userID uuid.UUID, enabled bool, secret string) error
	UpdateNotificationToken(userID uuid.UUID, token string) error
	FindAll() ([]models.User, error)
	UpdateRole(userID uuid.UUID, role models.UserRole) error
	UpdateMembership(userID uuid.UUID, tierID *uuid.UUID) error
	Delete(userID uuid.UUID) error
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
	if err := r.db.Preload("MembershipTier").Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	if err := r.db.Preload("MembershipTier").First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *userRepo) UpdatePassword(userID uuid.UUID, newPasswordHash string) error {
	return r.db.Model(&models.User{}).Where("id = ?", userID).Update("password_hash", newPasswordHash).Error
}

func (r *userRepo) CreatePasswordReset(reset *models.PasswordReset) error {
	return r.db.Create(reset).Error
}

func (r *userRepo) FindPasswordResetByToken(token string) (*models.PasswordReset, error) {
	var reset models.PasswordReset
	if err := r.db.Preload("User").Where("token = ?", token).First(&reset).Error; err != nil {
		return nil, err
	}
	return &reset, nil
}

func (r *userRepo) DeletePasswordReset(token string) error {
	return r.db.Where("token = ?", token).Delete(&models.PasswordReset{}).Error
}

func (r *userRepo) Update2FA(userID uuid.UUID, enabled bool, secret string) error {
	return r.db.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"two_factor_enabled": enabled,
		"two_factor_secret":  secret,
	}).Error
}

func (r *userRepo) UpdateNotificationToken(userID uuid.UUID, token string) error {
	return r.db.Model(&models.User{}).Where("id = ?", userID).Update("notification_token", token).Error
}

func (r *userRepo) FindAll() ([]models.User, error) {
	var users []models.User
	if err := r.db.Preload("MembershipTier").Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (r *userRepo) UpdateRole(userID uuid.UUID, role models.UserRole) error {
	return r.db.Model(&models.User{}).Where("id = ?", userID).Update("role", role).Error
}

func (r *userRepo) UpdateMembership(userID uuid.UUID, tierID *uuid.UUID) error {
	return r.db.Model(&models.User{}).Where("id = ?", userID).Update("membership_tier_id", tierID).Error
}

func (r *userRepo) Delete(userID uuid.UUID) error {
	return r.db.Where("id = ?", userID).Delete(&models.User{}).Error
}
