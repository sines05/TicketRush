package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
)

type ZoneConfig struct {
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	TotalRows   int     `json:"total_rows"`
	SeatsPerRow int     `json:"seats_per_row"`
}

type EventCreateRequest struct {
	Title       string       `json:"title"`
	Description string       `json:"description"`
	BannerURL   string       `json:"banner_url"`
	StartTime   string       `json:"start_time"` // ISO8601
	EndTime     string       `json:"end_time"`   // ISO8601
	IsPublished bool         `json:"is_published"`
	Zones       []ZoneConfig `json:"zones"`
}

type EventService interface {
	CreateEvent(req EventCreateRequest) (*models.Event, error)
	GetEvent(id uuid.UUID) (*models.Event, error)
	ListEvents() ([]models.Event, error)
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
		startTime, _ := time.Parse(time.RFC3339, req.StartTime)
		endTime, _ := time.Parse(time.RFC3339, req.EndTime)

		event = models.Event{
			Title:       req.Title,
			Description: req.Description,
			BannerURL:   req.BannerURL,
			StartTime:   startTime,
			EndTime:     endTime,
			IsPublished: req.IsPublished,
		}
		if err := tx.Create(&event).Error; err != nil {
			return err
		}

		for _, zCfg := range req.Zones {
			zone := models.EventZone{
				EventID:     event.ID,
				Name:        zCfg.Name,
				Price:       zCfg.Price,
				TotalRows:   zCfg.TotalRows,
				SeatsPerRow: zCfg.SeatsPerRow,
			}
			if err := tx.Create(&zone).Error; err != nil {
				return err
			}

			// Bulk Insert Seats
			var seats []models.Seat
			for r := 0; r < zCfg.TotalRows; r++ {
				rowLabel := fmt.Sprintf("%c", 'A'+r)
				for c := 1; c <= zCfg.SeatsPerRow; c++ {
					seats = append(seats, models.Seat{
						ZoneID:     zone.ID,
						RowLabel:   rowLabel,
						SeatNumber: c,
						Status:     models.SeatAvailable,
					})
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
			"zone_id": zone.ID,
			"name":    zone.Name,
			"price":   zone.Price,
			"seats":   seats,
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
