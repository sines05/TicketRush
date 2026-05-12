package dto

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"ticketrush/internal/models"
)

type OrderResponse struct {
	ID          uuid.UUID           `json:"id"`
	OrderID     uuid.UUID           `json:"order_id"`
	UserID      uuid.UUID           `json:"user_id"`
	EventID     uuid.UUID           `json:"event_id"`
	TotalAmount float64             `json:"total_amount"`
	Status      models.OrderStatus  `json:"status"`
	ExpiresAt   time.Time           `json:"expires_at"`
	OrderItems  []OrderItemResponse `json:"order_items,omitempty"`
	Event       *EventResponse      `json:"event,omitempty"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

type OrderItemResponse struct {
	ID      uuid.UUID `json:"id"`
	OrderID uuid.UUID `json:"order_id"`
	SeatID  uuid.UUID `json:"seat_id"`
	Price   float64   `json:"price"`
}

type TicketResponse struct {
	ID             uuid.UUID     `json:"ticket_id"`
	OrderID        uuid.UUID     `json:"order_id"`
	SeatID         uuid.UUID     `json:"seat_id"`
	UserID         uuid.UUID     `json:"user_id"`
	QRCodeToken    string        `json:"qr_code_token"`
	IsCheckedIn    bool          `json:"is_checked_in"`
	EventTitle     string        `json:"event_title,omitempty"`
	EventBannerURL string        `json:"event_banner_url,omitempty"`
	ZoneName       string        `json:"zone_name,omitempty"`
	SeatLabel      string        `json:"seat_label,omitempty"`
	RowLabel       string        `json:"row_label,omitempty"`
	SeatNumber     int           `json:"seat_number,omitempty"`
	Price          float64       `json:"price,omitempty"`
	Seat           *SeatResponse `json:"seat,omitempty"`
	CreatedAt      time.Time     `json:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at"`
}

func ToOrderResponse(order models.Order) OrderResponse {
	items := make([]OrderItemResponse, len(order.OrderItems))
	for i, item := range order.OrderItems {
		items[i] = OrderItemResponse{
			ID:      item.ID,
			OrderID: item.OrderID,
			SeatID:  item.SeatID,
			Price:   item.Price,
		}
	}

	var event *EventResponse
	if order.Event.ID != uuid.Nil {
		e := ToEventResponse(order.Event)
		event = &e
	}

	return OrderResponse{
		ID:          order.ID,
		OrderID:     order.ID,
		UserID:      order.UserID,
		EventID:     order.EventID,
		TotalAmount: order.TotalAmount,
		Status:      order.Status,
		ExpiresAt:   order.ExpiresAt,
		OrderItems:  items,
		Event:       event,
		CreatedAt:   order.CreatedAt,
		UpdatedAt:   order.UpdatedAt,
	}
}

func ToOrderResponses(orders []models.Order) []OrderResponse {
	responses := make([]OrderResponse, len(orders))
	for i, order := range orders {
		responses[i] = ToOrderResponse(order)
	}
	return responses
}

func ToTicketResponse(ticket models.Ticket) TicketResponse {
	var seat *SeatResponse
	if ticket.Seat.ID != uuid.Nil {
		seat = &SeatResponse{
			ID:             ticket.Seat.ID,
			ZoneID:         ticket.Seat.ZoneID,
			RowLabel:       ticket.Seat.RowLabel,
			SeatNumber:     ticket.Seat.SeatNumber,
			Status:         ticket.Seat.Status,
			LockedByUserID: ticket.Seat.LockedByUserID,
			LockedAt:       ticket.Seat.LockedAt,
		}
	}

	resp := TicketResponse{
		ID:          ticket.ID,
		OrderID:     ticket.OrderID,
		SeatID:      ticket.SeatID,
		UserID:      ticket.UserID,
		QRCodeToken: ticket.QRCodeToken,
		IsCheckedIn: ticket.IsCheckedIn,
		Seat:        seat,
		CreatedAt:   ticket.CreatedAt,
		UpdatedAt:   ticket.UpdatedAt,
	}

	if ticket.Seat.ID != uuid.Nil {
		resp.RowLabel = ticket.Seat.RowLabel
		resp.SeatNumber = ticket.Seat.SeatNumber
		resp.SeatLabel = fmt.Sprintf("%s-%d", ticket.Seat.RowLabel, ticket.Seat.SeatNumber)
		if ticket.Seat.Zone.ID != uuid.Nil {
			resp.ZoneName = ticket.Seat.Zone.Name
			resp.Price = ticket.Seat.Zone.Price
			if ticket.Seat.Zone.Event.ID != uuid.Nil {
				resp.EventTitle = ticket.Seat.Zone.Event.Title
				resp.EventBannerURL = ticket.Seat.Zone.Event.BannerURL
			}
		}
	}

	return resp
}

func ToTicketResponses(tickets []models.Ticket) []TicketResponse {
	responses := make([]TicketResponse, len(tickets))
	for i, ticket := range tickets {
		responses[i] = ToTicketResponse(ticket)
	}
	return responses
}

