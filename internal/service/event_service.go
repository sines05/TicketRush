package service

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrDuplicateZoneName = errors.New("duplicate zone name in event")

type ZoneConfig struct {
	Name          string         `json:"name"`
	Price         float64        `json:"price"`
	TotalRows     int            `json:"total_rows"`
	SeatsPerRow   int            `json:"seats_per_row"`
	RowSeatCounts []int          `json:"row_seat_counts"`
	LayoutMeta    models.JSONMap `json:"layout_meta"`
	CanvasX       float64        `json:"canvas_x"`
	CanvasY       float64        `json:"canvas_y"`
	Width         float64        `json:"width"`
	Height        float64        `json:"height"`
	RotationAngle float64        `json:"rotation_angle"`
	Capacity      int            `json:"capacity"`
	ShapeType     string         `json:"shape_type"`
}

type EventCreateRequest struct {
	Title       string       `json:"title"`
	Description string       `json:"description"`
	BannerURL   string       `json:"banner_url"`
	Category    string       `json:"category"`
	Location    string       `json:"location"`
	Address     string       `json:"address"`
	Latitude    float64      `json:"latitude"`
	Longitude   float64      `json:"longitude"`
	StartTime   string       `json:"start_time"` // ISO8601
	EndTime     string       `json:"end_time"`   // ISO8601
	IsPublished bool         `json:"is_published"`
	IsFeatured  bool         `json:"is_featured"`
	IsHero      bool         `json:"is_hero"`
	Zones       []ZoneConfig `json:"zones"`
}

type EventService interface {
	CreateEvent(req EventCreateRequest) (*models.Event, error)
	GetEvent(id uuid.UUID) (*models.Event, error)
	GetEventBySlug(slug string) (*models.Event, error)
	ListEvents(filter repository.EventFilter) ([]repository.EventSearchResult, error)
	ListFeaturedEvents(limit int) ([]models.Event, error)
	ListHeroEvents(limit int) ([]models.Event, error)
	ListTrendingEvents(ctx context.Context, limit int) ([]TrendingEvent, error)
	TrackEventView(ctx context.Context, eventID uuid.UUID) error
	GetSeatMap(eventID uuid.UUID) (map[string]interface{}, error)
	GetAdminStats(eventID *uuid.UUID) (map[string]interface{}, error)
	UpdateEvent(id uuid.UUID, req EventCreateRequest) (*models.Event, error)
	DeleteEvent(id uuid.UUID) error
}

type TrendingEvent struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	Slug      string    `json:"slug"`
	BannerURL string    `json:"banner_url"`
	Category  string    `json:"category"`
	Location  string    `json:"location"`
	StartTime time.Time `json:"start_time"`
	MinPrice  float64   `json:"min_price"`

	Rank    int   `json:"rank"`
	Sold7d  int64 `json:"sold_7d"`
	Views7d int64 `json:"views_7d"`
	Score   int64 `json:"score"`
}

type eventService struct {
	eventRepo   repository.EventRepository
	metricsRepo repository.EventMetricsRepository
	db          *gorm.DB
}

func rowLabelFromIndex(index int) string {
	if index < 0 {
		index = 0
	}
	label := ""
	for index >= 0 {
		label = string(rune('A'+(index%26))) + label
		index = index/26 - 1
	}
	return label
}

func normalizedRowSeatCounts(zCfg ZoneConfig) []int {
	counts := make([]int, 0)
	for _, count := range zCfg.RowSeatCounts {
		if count > 0 {
			counts = append(counts, count)
		}
	}
	if len(counts) > 0 {
		return counts
	}

	if zCfg.TotalRows <= 0 || zCfg.SeatsPerRow <= 0 {
		return counts
	}
	for r := 0; r < zCfg.TotalRows; r++ {
		counts = append(counts, zCfg.SeatsPerRow)
	}
	return counts
}

func validateZoneNames(zones []ZoneConfig) error {
	seen := make(map[string]int, len(zones))
	for idx, zone := range zones {
		name := strings.TrimSpace(zone.Name)
		if name == "" {
			return fmt.Errorf("zone %d name cannot be empty", idx+1)
		}
		key := strings.ToLower(name)
		if firstIndex, exists := seen[key]; exists {
			return fmt.Errorf("%w: %q (zones %d and %d)", ErrDuplicateZoneName, name, firstIndex+1, idx+1)
		}
		seen[key] = idx
	}
	return nil
}

func isUniqueZoneNameError(err error) bool {
	if err == nil {
		return false
	}

	return strings.Contains(err.Error(), "idx_event_zone_name") && strings.Contains(err.Error(), "duplicate key value violates unique constraint")
}

func NewEventService(eventRepo repository.EventRepository, metricsRepo repository.EventMetricsRepository, db *gorm.DB) EventService {
	return &eventService{
		eventRepo:   eventRepo,
		metricsRepo: metricsRepo,
		db:          db,
	}
}

func (s *eventService) CreateEvent(req EventCreateRequest) (*models.Event, error) {
	if err := validateZoneNames(req.Zones); err != nil {
		return nil, err
	}

	var event models.Event
	err := s.db.Transaction(func(tx *gorm.DB) error {
		startTime, err := time.Parse(time.RFC3339, req.StartTime)
		if err != nil {
			return fmt.Errorf("invalid start time format: %w", err)
		}
		endTime, err := time.Parse(time.RFC3339, req.EndTime)
		if err != nil {
			return fmt.Errorf("invalid end time format: %w", err)
		}

		event = models.Event{
			Title:       req.Title,
			Slug:        utils.GenerateSlug(req.Title),
			Description: req.Description,
			BannerURL:   req.BannerURL,
			Location:    req.Location,
			Address:     req.Address,
			Latitude:    req.Latitude,
			Longitude:   req.Longitude,
			Category:    req.Category,
			StartTime:   startTime,
			EndTime:     endTime,
			IsPublished: req.IsPublished,
			IsFeatured:  req.IsFeatured,
			IsHero:      req.IsHero,
		}
		if err := tx.Create(&event).Error; err != nil {
			return err
		}

		for _, zCfg := range req.Zones {
			zoneName := strings.TrimSpace(zCfg.Name)
			rowSeatCounts := normalizedRowSeatCounts(zCfg)
			totalRows := len(rowSeatCounts)
			seatsPerRow := 0
			totalCapacity := 0
			for _, count := range rowSeatCounts {
				if count > seatsPerRow {
					seatsPerRow = count
				}
				totalCapacity += count
			}
			if zCfg.Capacity > 0 {
				totalCapacity = zCfg.Capacity
			}

			shapeType := zCfg.ShapeType
			if shapeType == "" {
				shapeType = "theatre"
			}

			zone := models.EventZone{
				EventID:       event.ID,
				Name:          zoneName,
				Price:         zCfg.Price,
				TotalRows:     totalRows,
				SeatsPerRow:   seatsPerRow,
				LayoutMeta:    zCfg.LayoutMeta,
				CanvasX:       zCfg.CanvasX,
				CanvasY:       zCfg.CanvasY,
				Width:         zCfg.Width,
				Height:        zCfg.Height,
				RotationAngle: zCfg.RotationAngle,
				Capacity:      totalCapacity,
				ShapeType:     shapeType,
			}
			if err := tx.Create(&zone).Error; err != nil {
				if isUniqueZoneNameError(err) {
					return fmt.Errorf("%w: %q", ErrDuplicateZoneName, zoneName)
				}
				return err
			}

			// Bulk Insert Seats
			var seats []models.Seat
			for r, count := range rowSeatCounts {
				rowLabel := rowLabelFromIndex(r)
				for c := 1; c <= count; c++ {
					seats = append(seats, models.Seat{
						ZoneID:     zone.ID,
						RowLabel:   rowLabel,
						SeatNumber: c,
						Status:     models.SeatAvailable,
					})
				}
			}
			if len(seats) == 0 {
				return fmt.Errorf("zone %q has no seats", zoneName)
			}
			if err := tx.Create(&seats).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &event, nil
}

func (s *eventService) GetEvent(id uuid.UUID) (*models.Event, error) {
	return s.eventRepo.GetEventByID(id)
}

func (s *eventService) GetEventBySlug(slug string) (*models.Event, error) {
	return s.eventRepo.GetEventBySlug(slug)
}

func (s *eventService) ListEvents(filter repository.EventFilter) ([]repository.EventSearchResult, error) {
	return s.eventRepo.GetAllEvents(filter)
}

func (s *eventService) ListFeaturedEvents(limit int) ([]models.Event, error) {
	return s.eventRepo.GetFeaturedEvents(limit)
}

func (s *eventService) ListHeroEvents(limit int) ([]models.Event, error) {
	return s.eventRepo.GetHeroEvents(limit)
}

func (s *eventService) TrackEventView(ctx context.Context, eventID uuid.UUID) error {
	if s.metricsRepo == nil {
		return nil
	}
	return s.metricsRepo.IncrEventView(ctx, eventID, time.Now().UTC())
}

func (s *eventService) ListTrendingEvents(ctx context.Context, limit int) ([]TrendingEvent, error) {
	if limit <= 0 {
		limit = 5
	}
	if limit > 20 {
		limit = 20
	}

	// Fetch a larger candidate set from DB, then re-rank with views.
	candidateLimit := limit * 10
	if candidateLimit < 30 {
		candidateLimit = 30
	}
	if candidateLimit > 80 {
		candidateLimit = 80
	}

	since := time.Now().UTC().AddDate(0, 0, -7)
	stats, err := s.eventRepo.GetTrendingTicketStats(candidateLimit, since)
	if err != nil {
		return nil, err
	}
	if len(stats) == 0 {
		return []TrendingEvent{}, nil
	}

	ids := make([]uuid.UUID, 0, len(stats))
	for _, row := range stats {
		ids = append(ids, row.ID)
	}

	viewsMap := map[uuid.UUID]int64{}
	if s.metricsRepo != nil {
		viewsMap, _ = s.metricsRepo.GetEventViewsLastDays(ctx, ids, 7, time.Now().UTC())
	}

	out := make([]TrendingEvent, 0, len(stats))
	for _, row := range stats {
		views := viewsMap[row.ID]
		// Score heuristic: tickets sold matters much more than views.
		// Keep a small all-time factor so brand new events don't dominate solely by a few views.
		score := row.Sold7d*1000 + views + row.SoldAll*10
		out = append(out, TrendingEvent{
			ID:        row.ID,
			Title:     row.Title,
			Slug:      row.Slug,
			BannerURL: row.BannerURL,
			Category:  row.Category,
			Location:  row.Location,
			StartTime: row.StartTime,
			MinPrice:  row.MinPrice,
			Sold7d:    row.Sold7d,
			Views7d:   views,
			Score:     score,
		})
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].Score != out[j].Score {
			return out[i].Score > out[j].Score
		}
		return out[i].StartTime.Before(out[j].StartTime)
	})

	if len(out) > limit {
		out = out[:limit]
	}
	for i := range out {
		out[i].Rank = i + 1
	}

	return out, nil
}

func (s *eventService) GetSeatMap(eventID uuid.UUID) (map[string]interface{}, error) {
	zones, err := s.eventRepo.GetSeatMap(eventID)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0)
	for _, zone := range zones {
		seats := make([]map[string]interface{}, 0)
		for _, seat := range zone.Seats {
			seats = append(seats, map[string]interface{}{
				"seat_id":           seat.ID,
				"row_label":         seat.RowLabel,
				"seat_number":       seat.SeatNumber,
				"status":            seat.Status,
				"locked_by_user_id": seat.LockedByUserID,
			})
		}
		result = append(result, map[string]interface{}{
			"zone_id":        zone.ID,
			"name":           zone.Name,
			"price":          zone.Price,
			"total_rows":     zone.TotalRows,
			"seats_per_row":  zone.SeatsPerRow,
			"layout_meta":    zone.LayoutMeta,
			"canvas_x":       zone.CanvasX,
			"canvas_y":       zone.CanvasY,
			"width":          zone.Width,
			"height":         zone.Height,
			"rotation_angle": zone.RotationAngle,
			"capacity":       zone.Capacity,
			"shape_type":     zone.ShapeType,
			"seats":          seats,
		})
	}

	return map[string]interface{}{
		"event_id": eventID,
		"zones":    result,
	}, nil
}

func (s *eventService) GetAdminStats(eventID *uuid.UUID) (map[string]interface{}, error) {
	var totalRevenue float64
	query := s.db.Model(&models.Order{}).Where("status = ?", models.OrderCompleted)
	if eventID != nil {
		query = query.Where("event_id = ?", *eventID)
	}
	query.Select("COALESCE(SUM(total_amount), 0)").Scan(&totalRevenue)

	var totalSold int64
	querySold := s.db.Model(&models.Ticket{})
	if eventID != nil {
		querySold = querySold.Joins("JOIN orders ON orders.id = tickets.order_id").Where("orders.event_id = ?", *eventID)
	}
	querySold.Count(&totalSold)

	// Demographics: based on actual ticket purchasers, not all users
	var genders []struct {
		Gender string
		Count  int64
	}
	genderQuery := s.db.Model(&models.User{}).
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
	purchaserQuery := s.db.Model(&models.User{}).
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
	querySeats := s.db.Model(&models.Seat{})
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

func (s *eventService) UpdateEvent(id uuid.UUID, req EventCreateRequest) (*models.Event, error) {
	event, err := s.eventRepo.GetEventByID(id)
	if err != nil {
		return nil, fmt.Errorf("event not found")
	}

	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		return nil, fmt.Errorf("invalid start time format: %w", err)
	}
	endTime, err := time.Parse(time.RFC3339, req.EndTime)
	if err != nil {
		return nil, fmt.Errorf("invalid end time format: %w", err)
	}

	if event.Title != req.Title {
		event.Title = req.Title
		event.Slug = utils.GenerateSlug(req.Title)
	}
	event.Description = req.Description
	if req.Category != "" {
		event.Category = req.Category
	}
	if req.BannerURL != "" {
		event.BannerURL = req.BannerURL
	}
	if req.Location != "" {
		event.Location = req.Location
	}
	event.Address = req.Address
	event.Latitude = req.Latitude
	event.Longitude = req.Longitude
	event.StartTime = startTime
	event.EndTime = endTime
	event.IsPublished = req.IsPublished
	event.IsFeatured = req.IsFeatured
	event.IsHero = req.IsHero

	if err := s.eventRepo.UpdateEvent(event); err != nil {
		return nil, err
	}

	return event, nil
}

func (s *eventService) DeleteEvent(id uuid.UUID) error {
	// Check if event exists
	_, err := s.eventRepo.GetEventByID(id)
	if err != nil {
		return fmt.Errorf("event not found")
	}

	// Delete event (cascade should handle zones and seats)
	return s.eventRepo.DeleteEvent(id)
}
