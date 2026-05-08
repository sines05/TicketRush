package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"ticketrush/internal/models"
)

type MembershipRepository interface {
	GetTiers(ctx context.Context) ([]models.MembershipTier, error)
	GetTierByID(ctx context.Context, id uuid.UUID) (*models.MembershipTier, error)
	GetTierByName(ctx context.Context, name string) (*models.MembershipTier, error)
	UpdateUserTier(ctx context.Context, userID uuid.UUID, tierID uuid.UUID) error
}

type membershipRepo struct {
	db *gorm.DB
}

func NewMembershipRepository(db *gorm.DB) MembershipRepository {
	return &membershipRepo{db: db}
}

func (r *membershipRepo) GetTiers(ctx context.Context) ([]models.MembershipTier, error) {
	var tiers []models.MembershipTier
	err := r.db.Order("priority_level ASC").Find(&tiers).Error
	return tiers, err
}

func (r *membershipRepo) GetTierByID(ctx context.Context, id uuid.UUID) (*models.MembershipTier, error) {
	var tier models.MembershipTier
	err := r.db.First(&tier, id).Error
	if err != nil {
		return nil, err
	}
	return &tier, nil
}

func (r *membershipRepo) GetTierByName(ctx context.Context, name string) (*models.MembershipTier, error) {
	var tier models.MembershipTier
	err := r.db.Where("name = ?", name).First(&tier).Error
	if err != nil {
		return nil, err
	}
	return &tier, nil
}

func (r *membershipRepo) UpdateUserTier(ctx context.Context, userID uuid.UUID, tierID uuid.UUID) error {
	return r.db.Model(&models.User{}).Where("id = ?", userID).Update("membership_tier_id", tierID).Error
}
