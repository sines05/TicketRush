package repository

import (
	"context"
	"ticketrush/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventSearchResult struct {
	models.Event
	MinPrice float64 `gorm:"column:min_price"`
}

type EventFilter struct {
	Search   string
	Location string
	Category []string
	DateFrom *time.Time
	DateTo   *time.Time
	MinPrice *float64
	MaxPrice *float64
}

type EventRepository interface {
	CreateEvent(event *models.Event) error
	GetEventByID(id uuid.UUID) (*models.Event, error)
	GetEventBySlug(slug string) (*models.Event, error)
	GetAllEvents(filter EventFilter) ([]EventSearchResult, error)
	GetFeaturedEvents(limit int) ([]models.Event, error)
	GetHeroEvents(limit int) ([]models.Event, error)
	GetTrendingTicketStats(limit int, since time.Time) ([]EventTrendingTicketStats, error)
	UpdateEvent(event *models.Event) error
	DeleteEvent(id uuid.UUID) error
	GetSeatMap(eventID uuid.UUID) ([]models.EventZone, error)
	GetTotalSeats(ctx context.Context, eventID uuid.UUID) (int64, error)
}

type EventTrendingTicketStats struct {
	ID        uuid.UUID `gorm:"column:id"`
	Title     string    `gorm:"column:title"`
	Slug      string    `gorm:"column:slug"`
	BannerURL string    `gorm:"column:banner_url"`
	Category  string    `gorm:"column:category"`
	Location  string    `gorm:"column:location"`
	StartTime time.Time `gorm:"column:start_time"`
	MinPrice  float64   `gorm:"column:min_price"`
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

func (r *eventRepo) GetEventBySlug(slug string) (*models.Event, error) {
	var event models.Event
	if err := r.db.Where("slug = ?", slug).First(&event).Error; err != nil {
		return nil, err
	}
	return &event, nil
}

func (r *eventRepo) GetAllEvents(filter EventFilter) ([]EventSearchResult, error) {
	var results []EventSearchResult
	query := r.db.Table("events").
		Select("events.*, COALESCE(MIN(event_zones.price), 0) as min_price").
		Joins("LEFT JOIN event_zones ON event_zones.event_id = events.id").
		Where("events.is_published = ?", true).
		Where("events.deleted_at IS NULL").
		Group("events.id")

	if filter.Search != "" {
		query = query.Where("events.title ILIKE ?", "%"+filter.Search+"%")
	}
	if filter.Location != "" {
		if filter.Location == "other" {
			query = query.Where("events.location NOT IN ('Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Đà Lạt', 'Nha Trang')")
		} else {
			query = query.Where("events.location = ?", filter.Location)
		}
	}
	if len(filter.Category) > 0 {
		query = query.Where("events.category IN ?", filter.Category)
	}
	if filter.DateFrom != nil {
		query = query.Where("events.start_time >= ?", *filter.DateFrom)
	}
	if filter.DateTo != nil {
		query = query.Where("events.start_time <= ?", *filter.DateTo)
	}
	if filter.MinPrice != nil {
		query = query.Having("MIN(event_zones.price) >= ?", *filter.MinPrice)
	}
	if filter.MaxPrice != nil {
		query = query.Having("MIN(event_zones.price) <= ?", *filter.MaxPrice)
	}

	if err := query.Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
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

func (r *eventRepo) GetHeroEvents(limit int) ([]models.Event, error) {
	var events []models.Event
	if err := r.db.Where("is_published = ? AND is_hero = ?", true, true).
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
	e.slug,
	e.banner_url,
	e.category,
	e.location,
	e.start_time,
	(SELECT COALESCE(MIN(price), 0) FROM event_zones WHERE event_id = e.id) as min_price,
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
WHERE e.is_published = true AND e.deleted_at IS NULL
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

func (r *eventRepo) GetTotalSeats(ctx context.Context, eventID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.Seat{}).
		Joins("JOIN event_zones ON event_zones.id = seats.zone_id").
		Where("event_zones.event_id = ?", eventID).
		Count(&count).Error
	return count, err
}
