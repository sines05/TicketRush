package dto

import (
	"time"

	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/service"
)

type EventResponse struct {
	ID            uuid.UUID           `json:"id"`
	EventID       uuid.UUID           `json:"event_id"`
	Title         string              `json:"title"`
	Slug          string              `json:"slug"`
	Description   string              `json:"description"`
	BannerURL     string              `json:"banner_url"`
	Location      string              `json:"location"`
	Address       string              `json:"address"`
	Latitude      *float64            `json:"latitude"`
	Longitude     *float64            `json:"longitude"`
	StartTime     time.Time           `json:"start_time"`
	EndTime       time.Time           `json:"end_time"`
	IsPublished   bool                `json:"is_published"`
	IsFeatured    bool                `json:"is_featured"`
	IsHero        bool                `json:"is_hero"`
	Category      string              `json:"category"`
	IsQueueMode   bool                `json:"is_queue_mode"`
	OrganizerMeta models.JSONMap      `json:"organizer_meta"`
	EventMeta     models.JSONMap      `json:"event_meta"`
	Zones         []EventZoneResponse `json:"zones,omitempty"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
}

type EventZoneResponse struct {
	ID          uuid.UUID      `json:"id"`
	ZoneID      uuid.UUID      `json:"zone_id"`
	EventID     uuid.UUID      `json:"event_id"`
	Name        string         `json:"name"`
	Price       float64        `json:"price"`
	TotalRows   int            `json:"total_rows"`
	SeatsPerRow int            `json:"seats_per_row"`
	LayoutMeta  models.JSONMap `json:"layout_meta"`
	Seats       []SeatResponse `json:"seats,omitempty"`
}

type SeatResponse struct {
	ID             uuid.UUID         `json:"id"`
	SeatID         uuid.UUID         `json:"seat_id"`
	ZoneID         uuid.UUID         `json:"zone_id"`
	RowLabel       string            `json:"row_label"`
	SeatNumber     int               `json:"seat_number"`
	Status         models.SeatStatus `json:"status"`
	LockedByUserID *uuid.UUID        `json:"locked_by_user_id,omitempty"`
	LockedAt       *time.Time        `json:"locked_at,omitempty"`
}

type EventSearchResponse struct {
	EventResponse
	MinPrice float64 `json:"min_price"`
}

func ToEventSearchResponse(result repository.EventSearchResult) EventSearchResponse {
	return EventSearchResponse{
		EventResponse: ToEventResponse(result.Event),
		MinPrice:      result.MinPrice,
	}
}

func ToEventSearchResponses(results []repository.EventSearchResult) []EventSearchResponse {
	responses := make([]EventSearchResponse, len(results))
	for i, result := range results {
		responses[i] = ToEventSearchResponse(result)
	}
	return responses
}

func ToEventResponse(event models.Event) EventResponse {
	zones := make([]EventZoneResponse, len(event.Zones))
	for i, zone := range event.Zones {
		seats := make([]SeatResponse, len(zone.Seats))
		for j, seat := range zone.Seats {
			seats[j] = SeatResponse{
				ID:             seat.ID,
				SeatID:         seat.ID,
				ZoneID:         seat.ZoneID,
				RowLabel:       seat.RowLabel,
				SeatNumber:     seat.SeatNumber,
				Status:         seat.Status,
				LockedByUserID: seat.LockedByUserID,
				LockedAt:       seat.LockedAt,
			}
		}
		zones[i] = EventZoneResponse{
			ID:          zone.ID,
			ZoneID:      zone.ID,
			EventID:     zone.EventID,
			Name:        zone.Name,
			Price:       zone.Price,
			TotalRows:   zone.TotalRows,
			SeatsPerRow: zone.SeatsPerRow,
			LayoutMeta:  zone.LayoutMeta,
			Seats:       seats,
		}
	}

	return EventResponse{
		ID:            event.ID,
		EventID:       event.ID,
		Title:         event.Title,
		Slug:          event.Slug,
		Description:   event.Description,
		BannerURL:     event.BannerURL,
		Location:      event.Location,
		Address:       event.Address,
		Latitude:      event.Latitude,
		Longitude:     event.Longitude,
		StartTime:     event.StartTime,
		EndTime:       event.EndTime,
		IsPublished:   event.IsPublished,
		IsFeatured:    event.IsFeatured,
		IsHero:        event.IsHero,
		Category:      event.Category,
		IsQueueMode:   event.IsQueueMode,
		OrganizerMeta: event.OrganizerMeta,
		EventMeta:     event.EventMeta,
		Zones:         zones,
		CreatedAt:     event.CreatedAt,
		UpdatedAt:     event.UpdatedAt,
	}
}

func ToEventResponses(events []models.Event) []EventResponse {
	responses := make([]EventResponse, len(events))
	for i, event := range events {
		responses[i] = ToEventResponse(event)
	}
	return responses
}

type TrendingEventResponse struct {
	ID        uuid.UUID `json:"id"`
	EventID   uuid.UUID `json:"event_id"`
	Title     string    `json:"title"`
	Slug      string    `json:"slug"`
	BannerURL string    `json:"banner_url"`
	Category  string    `json:"category"`
	Location  string    `json:"location"`
	StartTime time.Time `json:"start_time"`
	MinPrice  float64   `json:"min_price"`
	Rank      int       `json:"rank"`
	Sold7d    int64     `json:"sold_7d"`
	Views7d   int64     `json:"views_7d"`
	Score     int64     `json:"score"`
}

func ToTrendingEventResponse(event service.TrendingEvent) TrendingEventResponse {
	return TrendingEventResponse{
		ID:        event.ID,
		EventID:   event.ID,
		Title:     event.Title,
		Slug:      event.Slug,
		BannerURL: event.BannerURL,
		Category:  event.Category,
		Location:  event.Location,
		StartTime: event.StartTime,
		MinPrice:  event.MinPrice,
		Rank:      event.Rank,
		Sold7d:    event.Sold7d,
		Views7d:   event.Views7d,
		Score:     event.Score,
	}
}

func ToTrendingEventResponses(events []service.TrendingEvent) []TrendingEventResponse {
	responses := make([]TrendingEventResponse, len(events))
	for i, event := range events {
		responses[i] = ToTrendingEventResponse(event)
	}
	return responses
}
