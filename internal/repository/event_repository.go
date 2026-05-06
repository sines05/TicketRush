package repository

import (
	"ticketrush/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventRepository interface {
	CreateEvent(event *models.Event) error
	GetEventByID(id uuid.UUID) (*models.Event, error)
	GetAllEvents(search string) ([]models.Event, error)
	GetFeaturedEvents(limit int) ([]models.Event, error)
	GetTrendingTicketStats(limit int, since time.Time) ([]EventTrendingTicketStats, error)
	UpdateEvent(event *models.Event) error
	DeleteEvent(id uuid.UUID) error
	GetSeatMap(eventID uuid.UUID) ([]models.EventZone, error)
}

type EventTrendingTicketStats struct {
	ID        uuid.UUID `gorm:"column:id"`
	Title     string    `gorm:"column:title"`
	BannerURL string    `gorm:"column:banner_url"`
	Category  string    `gorm:"column:category"`
	StartTime time.Time `gorm:"column:start_time"`
	Sold7d    int64     `gorm:"column:sold_7d"`
	SoldAll   int64     `gorm:"column:sold_all"`
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

func (r *eventRepo) GetAllEvents(search string) ([]models.Event, error) {
	var events []models.Event
	query := r.db.Where("is_published = ?", true)
	if search != "" {
		query = query.Where("title ILIKE ?", "%"+search+"%")
	}
	if err := query.Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (r *eventRepo) GetFeaturedEvents(limit int) ([]models.Event, error) {
	var events []models.Event
	if err := r.db.Where("is_published = ? AND is_featured = ?", true, true).
		Order("start_time ASC").
		Limit(limit).
		Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (r *eventRepo) GetTrendingTicketStats(limit int, since time.Time) ([]EventTrendingTicketStats, error) {
	if limit <= 0 {
		limit = 5
	}

	var out []EventTrendingTicketStats
	query := `
SELECT
	e.id,
	e.title,
	e.banner_url,
	e.category,
	e.start_time,
	COALESCE(SUM(CASE
		WHEN t.id IS NOT NULL AND o.status = 'COMPLETED' AND o.created_at >= ? THEN 1
		ELSE 0
	END), 0) AS sold_7d,
	COALESCE(SUM(CASE
		WHEN t.id IS NOT NULL AND o.status = 'COMPLETED' THEN 1
		ELSE 0
	END), 0) AS sold_all
FROM events e
LEFT JOIN orders o ON o.event_id = e.id
LEFT JOIN tickets t ON t.order_id = o.id
WHERE e.is_published = true
GROUP BY e.id
ORDER BY sold_7d DESC, sold_all DESC, e.start_time ASC
LIMIT ?;
`

	if err := r.db.Raw(query, since.UTC(), limit).Scan(&out).Error; err != nil {
		return nil, err
	}
	return out, nil
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
