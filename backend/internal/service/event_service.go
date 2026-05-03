package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"ticketrush/internal/models"
	"ticketrush/internal/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ZoneConfig struct {
	Name          string          `json:"name"`
	Price         float64         `json:"price"`
	TotalRows     int             `json:"total_rows"`
	SeatsPerRow   int             `json:"seats_per_row"`
	RowSeatCounts []int           `json:"row_seat_counts,omitempty"`
	LayoutMeta    json.RawMessage `json:"layout_meta,omitempty"`
}

type EventCreateRequest struct {
	Title       string       `json:"title"`
	Description string       `json:"description"`
	BannerURL   string       `json:"banner_url"`
	StartTime   string       `json:"start_time"` // ISO8601
	EndTime     string       `json:"end_time"`   // ISO8601
	IsPublished bool         `json:"is_published"`
	IsFeatured  bool         `json:"is_featured"`
	Category    string       `json:"category"`
	Zones       []ZoneConfig `json:"zones"`
}

type EventService interface {
	CreateEvent(req EventCreateRequest) (*models.Event, error)
	GetEvent(id uuid.UUID) (*models.Event, error)
	ListEvents() ([]models.Event, error)
	ListAdminEvents() ([]models.Event, error)
	ListFeaturedEvents(limit int) ([]models.Event, error)
	UpdateEvent(id uuid.UUID, req EventCreateRequest) (*models.Event, error)
	DeleteEvent(id uuid.UUID) error
	GetSeatMap(eventID uuid.UUID) (map[string]interface{}, error)
	GetAdminStats(eventID *uuid.UUID) (map[string]interface{}, error)
}

type eventService struct {
	eventRepo repository.EventRepository
	db        *gorm.DB
}

func NewEventService(eventRepo repository.EventRepository, db *gorm.DB) EventService {
	return &eventService{
		eventRepo: eventRepo,
		db:        db,
	}
}

func (s *eventService) CreateEvent(req EventCreateRequest) (*models.Event, error) {
	var event models.Event
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if strings.TrimSpace(req.Category) == "" {
			return fmt.Errorf("category is required")
		}
		startTime, _ := time.Parse(time.RFC3339, req.StartTime)
		endTime, _ := time.Parse(time.RFC3339, req.EndTime)

		event = models.Event{
			Title:       req.Title,
			Description: req.Description,
			BannerURL:   req.BannerURL,
			Category:    req.Category,
			StartTime:   startTime,
			EndTime:     endTime,
			// If admin marks event as featured, ensure it is published so it appears on the public hero slider.
			IsFeatured:  req.IsFeatured,
			IsPublished: req.IsPublished || req.IsFeatured,
		}
		if err := tx.Create(&event).Error; err != nil {
			return err
		}

		for _, zCfg := range req.Zones {
			rowCounts := normalizeRowSeatCounts(zCfg)
			totalRows := zCfg.TotalRows
			seatsPerRow := zCfg.SeatsPerRow
			if len(rowCounts) > 0 {
				totalRows = len(rowCounts)
				seatsPerRow = maxIntSlice(rowCounts)
			}

			zone := models.EventZone{
				EventID:     event.ID,
				Name:        zCfg.Name,
				Price:       zCfg.Price,
				TotalRows:   totalRows,
				SeatsPerRow: seatsPerRow,
				LayoutMeta:  normalizeLayoutMetaJSON(zCfg.LayoutMeta),
			}
			if err := tx.Create(&zone).Error; err != nil {
				return err
			}

			// Bulk Insert Seats
			var seats []models.Seat
			if len(rowCounts) > 0 {
				for r, cnt := range rowCounts {
					if cnt <= 0 {
						continue
					}
					rowLabel := fmt.Sprintf("%c", 'A'+r)
					for c := 1; c <= cnt; c++ {
						seats = append(seats, models.Seat{
							ZoneID:     zone.ID,
							RowLabel:   rowLabel,
							SeatNumber: c,
							Status:     models.SeatAvailable,
						})
					}
				}
			} else {
				for r := 0; r < totalRows; r++ {
					rowLabel := fmt.Sprintf("%c", 'A'+r)
					for c := 1; c <= seatsPerRow; c++ {
						seats = append(seats, models.Seat{
							ZoneID:     zone.ID,
							RowLabel:   rowLabel,
							SeatNumber: c,
							Status:     models.SeatAvailable,
						})
					}
				}
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

func (s *eventService) ListEvents() ([]models.Event, error) {
	return s.eventRepo.GetAllEvents()
}

func (s *eventService) ListAdminEvents() ([]models.Event, error) {
	return s.eventRepo.GetAllEventsForAdmin()
}

func (s *eventService) ListFeaturedEvents(limit int) ([]models.Event, error) {
	return s.eventRepo.GetFeaturedEvents(limit)
}

func (s *eventService) UpdateEvent(id uuid.UUID, req EventCreateRequest) (*models.Event, error) {
	var updated models.Event
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if strings.TrimSpace(req.Category) == "" {
			return fmt.Errorf("category is required")
		}
		if err := validateUniqueZoneNames(req.Zones); err != nil {
			return err
		}

		var event models.Event
		if err := tx.First(&event, id).Error; err != nil {
			return err
		}

		startTime, _ := time.Parse(time.RFC3339, req.StartTime)
		endTime, _ := time.Parse(time.RFC3339, req.EndTime)
		event.Title = req.Title
		event.Description = req.Description
		event.BannerURL = req.BannerURL
		event.Category = req.Category
		event.StartTime = startTime
		event.EndTime = endTime
		// If admin marks event as featured, ensure it is published so it appears on the public hero slider.
		event.IsFeatured = req.IsFeatured
		event.IsPublished = req.IsPublished || req.IsFeatured
		if err := tx.Save(&event).Error; err != nil {
			return err
		}

		// If zones are provided, replace seating plan.
		if req.Zones != nil {
			// Prevent modifying seat map if there are any orders for this event.
			var ordersCount int64
			if err := tx.Model(&models.Order{}).Where("event_id = ?", event.ID).Count(&ordersCount).Error; err != nil {
				return err
			}
			if ordersCount > 0 {
				// Allow display-only updates (layout_meta / price) if the seat counts per row remain unchanged.
				var existingZones []models.EventZone
				if err := tx.Where("event_id = ?", event.ID).Find(&existingZones).Error; err != nil {
					return err
				}
				byName := make(map[string]models.EventZone, len(existingZones))
				for _, z := range existingZones {
					byName[z.Name] = z
				}

				if len(existingZones) != len(req.Zones) {
					return fmt.Errorf("Không thể cập nhật sơ đồ ghế vì đã có đơn hàng cho sự kiện này")
				}

				for _, zCfg := range req.Zones {
					existing, ok := byName[zCfg.Name]
					if !ok {
						return fmt.Errorf("Không thể cập nhật sơ đồ ghế vì đã có đơn hàng cho sự kiện này")
					}

					expectedCounts := normalizeRowSeatCounts(zCfg)
					if len(expectedCounts) == 0 {
						rows := zCfg.TotalRows
						if rows < 0 {
							rows = 0
						}
						expectedCounts = make([]int, rows)
						for i := 0; i < rows; i++ {
							expectedCounts[i] = zCfg.SeatsPerRow
						}
					}

					var actualRows []struct {
						RowLabel string
						Count    int
					}
					if err := tx.Model(&models.Seat{}).
						Select("row_label, COUNT(*) as count").
						Where("zone_id = ?", existing.ID).
						Group("row_label").
						Order("row_label ASC").
						Scan(&actualRows).Error; err != nil {
						return err
					}
					actualCounts := make([]int, 0, len(actualRows))
					for _, r := range actualRows {
						actualCounts = append(actualCounts, r.Count)
					}

					if len(actualCounts) != len(expectedCounts) {
						return fmt.Errorf("Không thể cập nhật sơ đồ ghế vì đã có đơn hàng cho sự kiện này")
					}
					for i := range actualCounts {
						if actualCounts[i] != expectedCounts[i] {
							return fmt.Errorf("Không thể cập nhật sơ đồ ghế vì đã có đơn hàng cho sự kiện này")
						}
					}
				}

				// Seat counts unchanged => update zones' display metadata only.
				for _, zCfg := range req.Zones {
					existing := byName[zCfg.Name]
					expectedCounts := normalizeRowSeatCounts(zCfg)
					if len(expectedCounts) == 0 {
						rows := zCfg.TotalRows
						if rows < 0 {
							rows = 0
						}
						expectedCounts = make([]int, rows)
						for i := 0; i < rows; i++ {
							expectedCounts[i] = zCfg.SeatsPerRow
						}
					}

					existing.Price = zCfg.Price
					existing.TotalRows = len(expectedCounts)
					existing.SeatsPerRow = maxIntSlice(expectedCounts)
					existing.LayoutMeta = normalizeLayoutMetaJSON(zCfg.LayoutMeta)
					if err := tx.Save(&existing).Error; err != nil {
						return err
					}
				}

				updated = event
				return nil
			}

			// Delete existing seats/zones then recreate.
			// Always hard-delete all zones (including soft-deleted) before recreating.
			// This prevents unique index conflicts on (event_id, name).
			var zoneIDs []uuid.UUID
			if err := tx.Unscoped().Model(&models.EventZone{}).Where("event_id = ?", event.ID).Pluck("id", &zoneIDs).Error; err != nil {
				return err
			}
			if len(zoneIDs) > 0 {
				if err := tx.Unscoped().Where("zone_id IN ?", zoneIDs).Delete(&models.Seat{}).Error; err != nil {
					return err
				}
			}
			if err := tx.Unscoped().Where("event_id = ?", event.ID).Delete(&models.EventZone{}).Error; err != nil {
				return err
			}

			for _, zCfg := range req.Zones {
				rowCounts := normalizeRowSeatCounts(zCfg)
				totalRows := zCfg.TotalRows
				seatsPerRow := zCfg.SeatsPerRow
				if len(rowCounts) > 0 {
					totalRows = len(rowCounts)
					seatsPerRow = maxIntSlice(rowCounts)
				}

				zone := models.EventZone{
					EventID:     event.ID,
					Name:        zCfg.Name,
					Price:       zCfg.Price,
					TotalRows:   totalRows,
					SeatsPerRow: seatsPerRow,
					LayoutMeta:  normalizeLayoutMetaJSON(zCfg.LayoutMeta),
				}
				if err := tx.Create(&zone).Error; err != nil {
					return err
				}

				var seats []models.Seat
				if len(rowCounts) > 0 {
					for r, cnt := range rowCounts {
						if cnt <= 0 {
							continue
						}
						rowLabel := fmt.Sprintf("%c", 'A'+r)
						for c := 1; c <= cnt; c++ {
							seats = append(seats, models.Seat{
								ZoneID:     zone.ID,
								RowLabel:   rowLabel,
								SeatNumber: c,
								Status:     models.SeatAvailable,
							})
						}
					}
				} else {
					for r := 0; r < totalRows; r++ {
						rowLabel := fmt.Sprintf("%c", 'A'+r)
						for c := 1; c <= seatsPerRow; c++ {
							seats = append(seats, models.Seat{
								ZoneID:     zone.ID,
								RowLabel:   rowLabel,
								SeatNumber: c,
								Status:     models.SeatAvailable,
							})
						}
					}
				}
				if err := tx.Create(&seats).Error; err != nil {
					return err
				}
			}
		}

		updated = event
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func validateUniqueZoneNames(zones []ZoneConfig) error {
	if zones == nil {
		return nil
	}
	seen := make(map[string]struct{}, len(zones))
	for _, z := range zones {
		name := strings.TrimSpace(z.Name)
		if name == "" {
			continue
		}
		key := strings.ToLower(name)
		if _, ok := seen[key]; ok {
			return fmt.Errorf("Tên zone bị trùng: %s", name)
		}
		seen[key] = struct{}{}
	}
	return nil
}

func (s *eventService) DeleteEvent(id uuid.UUID) error {
	return s.eventRepo.DeleteEvent(id)
}

func normalizeRowSeatCounts(z ZoneConfig) []int {
	if len(z.RowSeatCounts) == 0 {
		return nil
	}
	out := make([]int, 0, len(z.RowSeatCounts))
	for _, v := range z.RowSeatCounts {
		if v <= 0 {
			continue
		}
		out = append(out, v)
	}
	return out
}

func normalizeLayoutMetaJSON(raw json.RawMessage) []byte {
	if len(raw) == 0 {
		return []byte("{}")
	}

	var tmp interface{}
	if err := json.Unmarshal(raw, &tmp); err != nil {
		return []byte("{}")
	}

	// Ensure we always persist normalized JSON.
	out, err := json.Marshal(tmp)
	if err != nil {
		return []byte("{}")
	}
	return out
}

func maxIntSlice(values []int) int {
	max := 0
	for _, v := range values {
		if v > max {
			max = v
		}
	}
	return max
}

func (s *eventService) GetSeatMap(eventID uuid.UUID) (map[string]interface{}, error) {
	zones, err := s.eventRepo.GetSeatMap(eventID)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0)
	for _, zone := range zones {
		var layoutMeta interface{} = map[string]interface{}{}
		if len(zone.LayoutMeta) > 0 {
			var parsed interface{}
			if err := json.Unmarshal(zone.LayoutMeta, &parsed); err == nil && parsed != nil {
				layoutMeta = parsed
			}
		}

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
			"zone_id":     zone.ID,
			"name":        zone.Name,
			"price":       zone.Price,
			"layout_meta": layoutMeta,
			"seats":       seats,
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

	// Demographics (simulated for brevity, normally you'd join with users)
	genderDist := make(map[string]int64)
	var genders []struct {
		Gender string
		Count  int64
	}
	s.db.Model(&models.User{}).Select("gender, count(*) as count").Group("gender").Scan(&genders)
	for _, g := range genders {
		genderDist[g.Gender] = g.Count
	}

	ageGroups := map[string]int64{
		"18-24": 0,
		"25-34": 0,
		"35+":   0,
	}
	// Simplified age group logic
	var users []models.User
	s.db.Find(&users)
	now := time.Now()
	for _, u := range users {
		age := now.Year() - u.DateOfBirth.Year()
		if age < 25 {
			ageGroups["18-24"]++
		} else if age < 35 {
			ageGroups["25-34"]++
		} else {
			ageGroups["35+"]++
		}
	}

	return map[string]interface{}{
		"total_revenue":        totalRevenue,
		"total_tickets_sold":   totalSold,
		"fill_rate_percentage": 0, // Placeholder
		"demographics": map[string]interface{}{
			"gender":     genderDist,
			"age_groups": ageGroups,
		},
	}, nil
}
