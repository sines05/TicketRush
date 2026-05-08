package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"ticketrush/internal/models"
)

type ReviewRepository interface {
	CreateReview(ctx context.Context, review *models.Review) error
	GetReviewsByEventID(ctx context.Context, eventID uuid.UUID) ([]models.Review, error)
	GetAverageRating(ctx context.Context, eventID uuid.UUID) (float64, error)
}

type reviewRepo struct {
	db *gorm.DB
}

func NewReviewRepository(db *gorm.DB) ReviewRepository {
	return &reviewRepo{db: db}
}

func (r *reviewRepo) CreateReview(ctx context.Context, review *models.Review) error {
	return r.db.Create(review).Error
}

func (r *reviewRepo) GetReviewsByEventID(ctx context.Context, eventID uuid.UUID) ([]models.Review, error) {
	var reviews []models.Review
	err := r.db.Preload("User").Where("event_id = ?", eventID).Order("created_at DESC").Find(&reviews).Error
	return reviews, err
}

func (r *reviewRepo) GetAverageRating(ctx context.Context, eventID uuid.UUID) (float64, error) {
	var avg float64
	err := r.db.Model(&models.Review{}).Where("event_id = ?", eventID).Select("COALESCE(AVG(rating), 0)").Scan(&avg).Error
	return avg, err
}
