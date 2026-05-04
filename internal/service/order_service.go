package service

import (
	"context"

	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"
)

type Broadcaster interface {
	Broadcast(data interface{})
}

type OrderService interface {
	LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error)
	Checkout(ctx context.Context, userID uuid.UUID, orderID uuid.UUID) (*models.Order, error)
	GetMyTickets(userID uuid.UUID) ([]models.Ticket, error)
	GetTickets(eventID *uuid.UUID) ([]models.Ticket, error)
	CheckInTicket(ctx context.Context, qrCodeToken string) (*models.Ticket, error)
}

type orderService struct {
	orderRepo   repository.OrderRepository
	queueRepo   repository.QueueRepository
	broadcaster Broadcaster
}

func NewOrderService(orderRepo repository.OrderRepository, queueRepo repository.QueueRepository, broadcaster Broadcaster) OrderService {
	return &orderService{
		orderRepo:   orderRepo,
		queueRepo:   queueRepo,
		broadcaster: broadcaster,
	}
}

func (s *orderService) LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error) {
	// Verify user has passed the virtual queue before allowing seat locking
	allowed, err := s.queueRepo.IsAllowed(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, utils.ErrQueueNotAllowed
	}

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

func (s *orderService) Checkout(ctx context.Context, userID uuid.UUID, orderID uuid.UUID) (*models.Order, error) {
	order, err := s.orderRepo.CompleteOrder(ctx, orderID)
	if err == nil {
		for _, item := range order.OrderItems {
			s.broadcaster.Broadcast(map[string]interface{}{
				"type":    "SEAT_SOLD",
				"seat_id": item.SeatID,
			})
		}
		// Remove user from Redis active set after successful checkout to free queue slot
		_ = s.queueRepo.RemoveFromActive(ctx, order.EventID, userID)
	}
	return order, err
}

func (s *orderService) GetMyTickets(userID uuid.UUID) ([]models.Ticket, error) {
	return s.orderRepo.GetTicketsByUserID(userID)
}

func (s *orderService) GetTickets(eventID *uuid.UUID) ([]models.Ticket, error) {
	return s.orderRepo.GetTicketsByEventID(eventID)
}

func (s *orderService) CheckInTicket(ctx context.Context, qrCodeToken string) (*models.Ticket, error) {
	return s.orderRepo.CheckInTicket(ctx, qrCodeToken)
}
