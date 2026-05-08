package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"ticketrush/internal/models"
)

type ComplaintRepository interface {
	CreateComplaint(ctx context.Context, complaint *models.Complaint) error
	GetComplaintsByUserID(ctx context.Context, userID uuid.UUID) ([]models.Complaint, error)
	GetAllComplaints(ctx context.Context) ([]models.Complaint, error)
	UpdateComplaintStatus(ctx context.Context, id uuid.UUID, status models.ComplaintStatus) error
}

type complaintRepo struct {
	db *gorm.DB
}

func NewComplaintRepository(db *gorm.DB) ComplaintRepository {
	return &complaintRepo{db: db}
}

func (r *complaintRepo) CreateComplaint(ctx context.Context, complaint *models.Complaint) error {
	return r.db.Create(complaint).Error
}

func (r *complaintRepo) GetComplaintsByUserID(ctx context.Context, userID uuid.UUID) ([]models.Complaint, error) {
	var complaints []models.Complaint
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&complaints).Error
	return complaints, err
}

func (r *complaintRepo) GetAllComplaints(ctx context.Context) ([]models.Complaint, error) {
	var complaints []models.Complaint
	err := r.db.Preload("User").Order("created_at DESC").Find(&complaints).Error
	return complaints, err
}

func (r *complaintRepo) UpdateComplaintStatus(ctx context.Context, id uuid.UUID, status models.ComplaintStatus) error {
	return r.db.Model(&models.Complaint{}).Where("id = ?", id).Update("status", status).Error
}
