package service

import (
	"context"

	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
)

type Broadcaster interface {
	Broadcast(data interface{})
}

type OrderService interface {
	LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error)
	Checkout(ctx context.Context, orderID uuid.UUID) (*models.Order, error)
	GetMyTickets(userID uuid.UUID) ([]models.Ticket, error)
}

type orderService struct {
	orderRepo repository.OrderRepository
	broadcaster Broadcaster
}

func NewOrderService(orderRepo repository.OrderRepository, broadcaster Broadcaster) OrderService {
	return &orderService{
		orderRepo:   orderRepo,
		broadcaster: broadcaster,
	}
}

func (s *orderService) LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error) {
	order, err := s.orderRepo.LockSeats(ctx, userID, eventID, seatIDs)
	if err == nil {
		for _, seatID := range seatIDs {
			s.broadcaster.Broadcast(map[string]interface{}{
				"type":    "SEAT_LOCKED",
				"seat_id": seatID,
			})
		}
	}
	return order, err
}

func (s *orderService) Checkout(ctx context.Context, orderID uuid.UUID) (*models.Order, error) {
	order, err := s.orderRepo.CompleteOrder(ctx, orderID)
	if err == nil {
		for _, item := range order.OrderItems {
			s.broadcaster.Broadcast(map[string]interface{}{
				"type":    "SEAT_SOLD",
				"seat_id": item.SeatID,
			})
		}
	}
	return order, err
}

func (s *orderService) GetMyTickets(userID uuid.UUID) ([]models.Ticket, error) {
	return s.orderRepo.GetTicketsByUserID(userID)
}
