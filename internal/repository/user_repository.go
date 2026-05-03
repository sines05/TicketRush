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
	UpdatePassword(userID uuid.UUID, newPasswordHash string) error
	CreatePasswordReset(reset *models.PasswordReset) error
	FindPasswordResetByToken(token string) (*models.PasswordReset, error)
	DeletePasswordReset(token string) error
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
