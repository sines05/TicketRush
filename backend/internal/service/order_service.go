package service

import (
	"context"

	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
)

type OrderService interface {
	LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error)
	Checkout(ctx context.Context, orderID uuid.UUID) (*models.Order, error)
	GetMyTickets(userID uuid.UUID) ([]models.Ticket, error)
}

type orderService struct {
	orderRepo repository.OrderRepository
}

func NewOrderService(orderRepo repository.OrderRepository) OrderService {
	return &orderService{
		orderRepo: orderRepo,
	}
}

func (s *orderService) LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error) {
	return s.orderRepo.LockSeats(ctx, userID, eventID, seatIDs)
}

func (s *orderService) Checkout(ctx context.Context, orderID uuid.UUID) (*models.Order, error) {
	return s.orderRepo.CompleteOrder(ctx, orderID)
}

func (s *orderService) GetMyTickets(userID uuid.UUID) ([]models.Ticket, error) {
	return s.orderRepo.GetTicketsByUserID(userID)
}
