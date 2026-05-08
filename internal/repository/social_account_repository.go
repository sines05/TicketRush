package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"ticketrush/internal/models"
)

type SocialAccountRepository interface {
	LinkAccount(ctx context.Context, account *models.SocialAccount) error
	GetAccountsByUserID(ctx context.Context, userID uuid.UUID) ([]models.SocialAccount, error)
	GetAccountByProvider(ctx context.Context, provider string, providerUserID string) (*models.SocialAccount, error)
}

type socialAccountRepo struct {
	db *gorm.DB
}

func NewSocialAccountRepository(db *gorm.DB) SocialAccountRepository {
	return &socialAccountRepo{db: db}
}

func (r *socialAccountRepo) LinkAccount(ctx context.Context, account *models.SocialAccount) error {
	return r.db.Create(account).Error
}

func (r *socialAccountRepo) GetAccountsByUserID(ctx context.Context, userID uuid.UUID) ([]models.SocialAccount, error) {
	var accounts []models.SocialAccount
	err := r.db.Where("user_id = ?", userID).Find(&accounts).Error
	return accounts, err
}

func (r *socialAccountRepo) GetAccountByProvider(ctx context.Context, provider string, providerUserID string) (*models.SocialAccount, error) {
	var account models.SocialAccount
	err := r.db.Where("provider = ? AND provider_user_id = ?", provider, providerUserID).First(&account).Error
	if err != nil {
		return nil, err
	}
	return &account, nil
}
