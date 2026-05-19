package repository

import (
	"context"
	"strings"
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
	CreateEventWithZones(ctx context.Context, event *models.Event, zones []models.EventZone, zoneSeats [][]models.Seat) error
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
	GetSimilarEvents(ctx context.Context, eventID uuid.UUID, category string, limit int) ([]models.Event, error)
	GetAdminStats(ctx context.Context, eventID *uuid.UUID) (map[string]interface{}, error)
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

var locationFilterAliases = map[string]string{
	"hcm":         "Hồ Chí Minh",
	"ho-chi-minh": "Hồ Chí Minh",
	"hochiminh":   "Hồ Chí Minh",
	"saigon":      "Hồ Chí Minh",
	"hanoi":       "Hà Nội",
	"ha-noi":      "Hà Nội",
	"danang":      "Đà Nẵng",
	"da-nang":     "Đà Nẵng",
	"dalat":       "Đà Lạt",
	"da-lat":      "Đà Lạt",
	"nhatrang":    "Nha Trang",
	"nha-trang":   "Nha Trang",
	"cantho":      "Cần Thơ",
	"can-tho":     "Cần Thơ",
}

var primaryLocationNames = []string{
	"Hồ Chí Minh",
	"Hà Nội",
	"Đà Nẵng",
	"Cần Thơ",
	"Đà Lạt",
	"Nha Trang",
}

func normalizeLocationFilter(location string) string {
	normalized := strings.TrimSpace(location)
	if normalized == "" {
		return ""
	}

	if alias, ok := locationFilterAliases[strings.ToLower(normalized)]; ok {
		return alias
	}

	return normalized
}

func NewEventRepository(db *gorm.DB) EventRepository {
	return &eventRepo{db: db}
}

func (r *eventRepo) CreateEvent(event *models.Event) error {
	return r.db.Create(event).Error
}

func (r *eventRepo) CreateEventWithZones(ctx context.Context, event *models.Event, zones []models.EventZone, zoneSeats [][]models.Seat) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(event).Error; err != nil {
			return err
		}

		for i := range zones {
			zones[i].EventID = event.ID
			if err := tx.Create(&zones[i]).Error; err != nil {
				return err
			}

			if len(zoneSeats[i]) > 0 {
				for j := range zoneSeats[i] {
					zoneSeats[i][j].ZoneID = zones[i].ID
				}
				if err := tx.Create(&zoneSeats[i]).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
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
		location := normalizeLocationFilter(filter.Location)
		if strings.EqualFold(location, "other") {
			query = query.Where("events.location NOT IN ?", primaryLocationNames)
		} else {
			query = query.Where("events.location = ?", location)
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
	if err := r.db.Where("is_published = ? AND is_featured = ? AND start_time > ?", true, true, time.Now().UTC()).
		Order("start_time ASC").
		Limit(limit).
		Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (r *eventRepo) GetHeroEvents(limit int) ([]models.Event, error) {
	var events []models.Event
	if err := r.db.Where("is_published = ? AND is_hero = ? AND start_time > ?", true, true, time.Now().UTC()).
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
WHERE e.is_published = true AND e.deleted_at IS NULL AND e.end_time > ?
GROUP BY e.id
ORDER BY sold_7d DESC, sold_all DESC, e.start_time ASC
LIMIT ?;
`

	if err := r.db.Raw(query, since.UTC(), time.Now().UTC(), limit).Scan(&out).Error; err != nil {
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

func (r *eventRepo) GetSimilarEvents(ctx context.Context, eventID uuid.UUID, category string, limit int) ([]models.Event, error) {
	var events []models.Event
	err := r.db.WithContext(ctx).
		Where("category = ? AND id <> ? AND is_published = ?", category, eventID, true).
		Limit(limit).
		Find(&events).Error
	return events, err
}

func (r *eventRepo) GetAdminStats(ctx context.Context, eventID *uuid.UUID) (map[string]interface{}, error) {
	var totalRevenue float64
	query := r.db.WithContext(ctx).Model(&models.Order{}).Where("status = ?", models.OrderCompleted)
	if eventID != nil {
		query = query.Where("event_id = ?", *eventID)
	}
	query.Select("COALESCE(SUM(total_amount), 0)").Scan(&totalRevenue)

	var totalSold int64
	querySold := r.db.WithContext(ctx).Model(&models.Ticket{})
	if eventID != nil {
		querySold = querySold.Joins("JOIN orders ON orders.id = tickets.order_id").Where("orders.event_id = ?", *eventID)
	}
	querySold.Count(&totalSold)

	// Demographics: based on actual ticket purchasers, not all users
	var genders []struct {
		Gender string
		Count  int64
	}
	genderQuery := r.db.WithContext(ctx).Model(&models.User{}).
		Select("users.gender, count(DISTINCT users.id) as count").
		Joins("JOIN tickets ON tickets.user_id = users.id").
		Joins("JOIN orders ON orders.id = tickets.order_id")
	if eventID != nil {
		genderQuery = genderQuery.Where("orders.event_id = ?", *eventID)
	}
	genderQuery.Group("users.gender").Scan(&genders)

	genderList := make([]map[string]interface{}, 0)
	for _, g := range genders {
		genderList = append(genderList, map[string]interface{}{
			"gender": g.Gender,
			"count":  g.Count,
		})
	}

	// Age groups: based on ticket purchasers
	ageGroups := map[string]int64{
		"18-24": 0,
		"25-34": 0,
		"35+":   0,
	}
	var purchasers []models.User
	purchaserQuery := r.db.WithContext(ctx).Model(&models.User{}).
		Select("DISTINCT users.id, users.date_of_birth").
		Joins("JOIN tickets ON tickets.user_id = users.id").
		Joins("JOIN orders ON orders.id = tickets.order_id")
	if eventID != nil {
		purchaserQuery = purchaserQuery.Where("orders.event_id = ?", *eventID)
	}
	purchaserQuery.Find(&purchasers)

	now := time.Now().UTC()
	for _, u := range purchasers {
		if u.DateOfBirth.IsZero() {
			continue
		}
		age := now.Year() - u.DateOfBirth.Year()
		if age < 25 {
			ageGroups["18-24"]++
		} else if age < 35 {
			ageGroups["25-34"]++
		} else {
			ageGroups["35+"]++
		}
	}

	var totalSeats int64
	querySeats := r.db.WithContext(ctx).Model(&models.Seat{})
	if eventID != nil {
		querySeats = querySeats.Joins("JOIN event_zones ON event_zones.id = seats.zone_id").Where("event_zones.event_id = ?", *eventID)
	}
	querySeats.Count(&totalSeats)

	occupancyRate := 0.0
	if totalSeats > 0 {
		occupancyRate = float64(totalSold) / float64(totalSeats)
	}

	return map[string]interface{}{
		"total_revenue":  totalRevenue,
		"total_sold":     totalSold,
		"occupancy_rate": occupancyRate,
		"gender_dist":    genderList,
		"age_dist":       ageGroups,
	}, nil
}
