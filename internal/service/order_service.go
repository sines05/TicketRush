package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/queue"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"
)

type Broadcaster interface {
	Broadcast(channel string, data interface{})
}

type OrderService interface {
	LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID, queueToken string) (*models.Order, error)
	Checkout(ctx context.Context, userID uuid.UUID, orderID uuid.UUID) (*models.Order, error)
	CancelOrder(ctx context.Context, userID uuid.UUID, orderID uuid.UUID) error
	GetMyTickets(userID uuid.UUID) ([]models.Ticket, error)
	GetTickets(eventID *uuid.UUID) ([]models.Ticket, error)
	CheckInTicket(ctx context.Context, qrCodeToken string) (*models.Ticket, error)
}

type orderService struct {
	orderRepo   repository.OrderRepository
	eventRepo   repository.EventRepository
	queueRepo   queue.Repository
	broadcaster Broadcaster
	notifier    NotificationService
	userRepo    repository.UserRepository
}

func NewOrderService(orderRepo repository.OrderRepository, eventRepo repository.EventRepository, queueRepo queue.Repository, broadcaster Broadcaster, notifier NotificationService, userRepo repository.UserRepository) OrderService {
	return &orderService{
		orderRepo:   orderRepo,
		eventRepo:   eventRepo,
		queueRepo:   queueRepo,
		broadcaster: broadcaster,
		notifier:    notifier,
		userRepo:    userRepo,
	}
}

func (s *orderService) LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID, queueToken string) (*models.Order, error) {
	// 1. Fetch Event to check if Queue Mode is enabled
	event, err := s.eventRepo.GetEventByID(eventID)
	if err != nil {
		return nil, err
	}

	if event.IsQueueMode {
		if queueToken == "" {
			return nil, errors.New("missing X-Queue-Token")
		}
		session, err := s.queueRepo.GetSession(ctx, queueToken)
		if err != nil || session == nil || session.UserID != userID || session.EventID != eventID {
			return nil, errors.New("invalid X-Queue-Token")
		}
		if session.Status != "allowed" {
			return nil, utils.ErrQueueNotAllowed
		}
	}

	// PROACTIVE CLEANUP: Check if user already has a pending order for this event
	existingOrder, err := s.orderRepo.FindPendingOrderByUserAndEvent(ctx, userID, eventID)
	if err == nil && existingOrder != nil {
		// Cancel the old order to release seats before creating a new one
		// We use orderRepo.CancelOrder directly to avoid removing the user from the queue's active set
		seatIDs, err := s.orderRepo.CancelOrder(ctx, existingOrder.ID, userID)
		if err == nil {
			channelName := "event:" + eventID.String()
			s.broadcaster.Broadcast(channelName, map[string]interface{}{
				"type":     "SEATS_RELEASED",
				"seat_ids": seatIDs,
				"user_id":  userID,
			})
		}
	}

	order, err := s.orderRepo.LockSeats(ctx, userID, eventID, seatIDs)
	if err == nil {
		channelName := "event:" + eventID.String()
		s.broadcaster.Broadcast(channelName, map[string]interface{}{
			"type":     "SEATS_LOCKED",
			"seat_ids": seatIDs,
			"user_id":  userID,
		})
	}
	return order, err
}

func (s *orderService) Checkout(ctx context.Context, userID uuid.UUID, orderID uuid.UUID) (*models.Order, error) {
	order, err := s.orderRepo.CompleteOrder(ctx, orderID)
	if err == nil {
		channelName := "event:" + order.EventID.String()
		var seatIDs []uuid.UUID
		for _, item := range order.OrderItems {
			seatIDs = append(seatIDs, item.SeatID)
		}

		s.broadcaster.Broadcast(channelName, map[string]interface{}{
			"type":     "SEATS_SOLD",
			"seat_ids": seatIDs,
			"user_id":  userID,
		})
		// Remove user from Redis active set after successful checkout to free queue slot
		_ = s.queueRepo.RemoveFromActive(ctx, order.EventID, userID)

		// CLEANUP: Delete session after successful checkout
		session, err := s.queueRepo.GetSessionByEventAndUser(ctx, order.EventID, userID)
		if err == nil && session != nil {
			_ = s.queueRepo.DeleteSession(ctx, session.Token, order.EventID, userID)
		}

		// Async Notification
		user, _ := s.userRepo.FindByID(userID)
		tickets, _ := s.orderRepo.GetTicketsByOrderID(order.ID)
		s.notifier.NotifyTicketPurchased(user, tickets, &order.Event)
		s.notifier.NotifyOrderConfirmation(user, order)
	}
	return order, err
}

func (s *orderService) CancelOrder(ctx context.Context, userID uuid.UUID, orderID uuid.UUID) error {
	// Fetch order first to get EventID for broadcasting
	order, err := s.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return err
	}

	seatIDs, err := s.orderRepo.CancelOrder(ctx, orderID, userID)
	if err == nil {
		channelName := "event:" + order.EventID.String()
		s.broadcaster.Broadcast(channelName, map[string]interface{}{
			"type":     "SEATS_RELEASED",
			"seat_ids": seatIDs,
			"user_id":  userID,
		})
	}
	return err
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
