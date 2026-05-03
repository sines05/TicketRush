package repository

import (
	"ticketrush/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventRepository interface {
	CreateEvent(event *models.Event) error
	GetEventByID(id uuid.UUID) (*models.Event, error)
	GetAllEvents() ([]models.Event, error)
	GetAllEventsForAdmin() ([]models.Event, error)
	GetFeaturedEvents(limit int) ([]models.Event, error)
	UpdateEvent(event *models.Event) error
	DeleteEvent(id uuid.UUID) error
	GetSeatMap(eventID uuid.UUID) ([]models.EventZone, error)
}

type eventRepo struct {
	db *gorm.DB
}

func NewEventRepository(db *gorm.DB) EventRepository {
	return &eventRepo{db: db}
}

func (r *eventRepo) CreateEvent(event *models.Event) error {
	return r.db.Create(event).Error
}

func (r *eventRepo) GetEventByID(id uuid.UUID) (*models.Event, error) {
	var event models.Event
	if err := r.db.First(&event, id).Error; err != nil {
		return nil, err
	}
	return &event, nil
}

func (r *eventRepo) GetAllEvents() ([]models.Event, error) {
	var events []models.Event
	if err := r.db.Where("is_published = ?", true).Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (r *eventRepo) GetAllEventsForAdmin() ([]models.Event, error) {
	var events []models.Event
	if err := r.db.Order("start_time DESC").Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (r *eventRepo) GetFeaturedEvents(limit int) ([]models.Event, error) {
	var events []models.Event
	query := r.db.Where("is_featured = ? AND is_published = ?", true, true).Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (r *eventRepo) UpdateEvent(event *models.Event) error {
	return r.db.Save(event).Error
}

func (r *eventRepo) DeleteEvent(id uuid.UUID) error {
	return r.db.Delete(&models.Event{}, id).Error
}

func (r *eventRepo) GetSeatMap(eventID uuid.UUID) ([]models.EventZone, error) {
	var zones []models.EventZone
	if err := r.db.Preload("Seats", func(db *gorm.DB) *gorm.DB {
		return db.Order("row_label ASC, seat_number ASC")
	}).Where("event_id = ?", eventID).Find(&zones).Error; err != nil {
		return nil, err
	}
	return zones, nil
}
