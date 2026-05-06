package tests

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
)

type mockOrderRepo struct {
	lockSeatsFunc     func(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error)
	completeOrderFunc func(ctx context.Context, orderID uuid.UUID) (*models.Order, error)
	cancelOrderFunc   func(ctx context.Context, orderID uuid.UUID, userID uuid.UUID) ([]uuid.UUID, error)
}

func (m *mockOrderRepo) LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error) {
	if m.lockSeatsFunc != nil {
		return m.lockSeatsFunc(ctx, userID, eventID, seatIDs)
	}
	return nil, nil
}

func (m *mockOrderRepo) CompleteOrder(ctx context.Context, orderID uuid.UUID) (*models.Order, error) {
	if m.completeOrderFunc != nil {
		return m.completeOrderFunc(ctx, orderID)
	}
	return nil, nil
}

func (m *mockOrderRepo) GetOrderByID(id uuid.UUID) (*models.Order, error) { return nil, nil }
func (m *mockOrderRepo) GetExpiredOrders(limit int) ([]models.Order, error) { return nil, nil }
func (m *mockOrderRepo) ReleaseOrder(ctx context.Context, orderID uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (m *mockOrderRepo) CancelOrder(ctx context.Context, orderID uuid.UUID, userID uuid.UUID) ([]uuid.UUID, error) {
	if m.cancelOrderFunc != nil {
		return m.cancelOrderFunc(ctx, orderID, userID)
	}
	return nil, nil
}
func (m *mockOrderRepo) GetTicketsByUserID(userID uuid.UUID) ([]models.Ticket, error) { return nil, nil }
func (m *mockOrderRepo) GetTicketsByEventID(eventID *uuid.UUID) ([]models.Ticket, error) { return nil, nil }
func (m *mockOrderRepo) CheckInTicket(ctx context.Context, qrCodeToken string) (*models.Ticket, error) { return nil, nil }

// mockQueueRepo always returns "allowed" so LockSeats can proceed
type mockQueueRepo struct{}

func (m *mockQueueRepo) AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error { return nil }
func (m *mockQueueRepo) GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error) { return 0, nil }
func (m *mockQueueRepo) IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error) { return true, nil }
func (m *mockQueueRepo) AllowUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error { return nil }
func (m *mockQueueRepo) PopFromQueue(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, error) { return nil, nil }
func (m *mockQueueRepo) GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error) { return 0, nil }
func (m *mockQueueRepo) RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error { return nil }

// MockBroadcaster
type mockBroadcaster struct {
	broadcasts []interface{}
}

func (m *mockBroadcaster) Broadcast(data interface{}) {
	m.broadcasts = append(m.broadcasts, data)
}

func TestOrderService_LockSeats_Broadcast(t *testing.T) {
	mockRepo := &mockOrderRepo{
		lockSeatsFunc: func(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error) {
			// Mock successful lock
			return &models.Order{
				BaseModel: models.BaseModel{ID: uuid.New()},
				OrderItems: []models.OrderItem{
					{SeatID: seatIDs[0]},
				},
			}, nil
		},
	}
	mockBroadcaster := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, &mockQueueRepo{}, mockBroadcaster)

	seatID := uuid.New()
	_, err := orderService.LockSeats(context.Background(), uuid.New(), uuid.New(), []uuid.UUID{seatID})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(mockBroadcaster.broadcasts) != 1 {
		t.Fatalf("expected 1 broadcast, got %d", len(mockBroadcaster.broadcasts))
	}

	msg, ok := mockBroadcaster.broadcasts[0].(map[string]interface{})
	if !ok {
		t.Fatalf("expected map[string]interface{} broadcast data")
	}

	if msg["type"] != "SEAT_LOCKED" {
		t.Errorf("expected type SEAT_LOCKED, got %v", msg["type"])
	}

	if msg["seat_id"] != seatID {
		t.Errorf("expected seat_id %v, got %v", seatID, msg["seat_id"])
	}
}

func TestOrderService_Checkout_Broadcast(t *testing.T) {
	seatID := uuid.New()
	mockRepo := &mockOrderRepo{
		completeOrderFunc: func(ctx context.Context, orderID uuid.UUID) (*models.Order, error) {
			// Mock successful checkout
			return &models.Order{
				BaseModel: models.BaseModel{ID: orderID},
				OrderItems: []models.OrderItem{
					{SeatID: seatID},
				},
			}, nil
		},
	}
	mockBroadcaster := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, &mockQueueRepo{}, mockBroadcaster)

	_, err := orderService.Checkout(context.Background(), uuid.New(), uuid.New())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(mockBroadcaster.broadcasts) != 1 {
		t.Fatalf("expected 1 broadcast, got %d", len(mockBroadcaster.broadcasts))
	}

	msg, ok := mockBroadcaster.broadcasts[0].(map[string]interface{})
	if !ok {
		t.Fatalf("expected map[string]interface{} broadcast data")
	}

	if msg["type"] != "SEAT_SOLD" {
		t.Errorf("expected type SEAT_SOLD, got %v", msg["type"])
	}

	if msg["seat_id"] != seatID {
		t.Errorf("expected seat_id %v, got %v", seatID, msg["seat_id"])
	}
}

// =============================================================================
// CancelOrder Tests (TDD RED phase — will fail until CancelOrder is implemented)
// =============================================================================

func TestOrderService_CancelOrder_Success(t *testing.T) {
	userID := uuid.New()
	seatIDs := []uuid.UUID{uuid.New(), uuid.New()}
	mockRepo := &mockOrderRepo{
		cancelOrderFunc: func(ctx context.Context, orderID uuid.UUID, uid uuid.UUID) ([]uuid.UUID, error) {
			if uid != userID {
				t.Errorf("expected userID %v, got %v", userID, uid)
			}
			return seatIDs, nil
		},
	}
	mockBroadcaster := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, &mockQueueRepo{}, mockBroadcaster)

	err := orderService.CancelOrder(context.Background(), userID, uuid.New())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(mockBroadcaster.broadcasts) != len(seatIDs) {
		t.Fatalf("expected %d broadcasts, got %d", len(seatIDs), len(mockBroadcaster.broadcasts))
	}

	for i, seatID := range seatIDs {
		msg, ok := mockBroadcaster.broadcasts[i].(map[string]interface{})
		if !ok {
			t.Fatalf("expected map[string]interface{} broadcast data")
		}
		if msg["type"] != "SEAT_RELEASED" {
			t.Errorf("expected type SEAT_RELEASED, got %v", msg["type"])
		}
		if msg["seat_id"] != seatID {
			t.Errorf("expected seat_id %v, got %v", seatID, msg["seat_id"])
		}
	}
}

func TestOrderService_CancelOrder_NotFound(t *testing.T) {
	mockRepo := &mockOrderRepo{
		cancelOrderFunc: func(ctx context.Context, orderID uuid.UUID, userID uuid.UUID) ([]uuid.UUID, error) {
			return nil, utils.ErrOrderNotFound
		},
	}
	mockBroadcaster := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, &mockQueueRepo{}, mockBroadcaster)

	err := orderService.CancelOrder(context.Background(), uuid.New(), uuid.New())
	if err == nil {
		t.Fatal("expected error for order not found, got nil")
	}
	if !errors.Is(err, utils.ErrOrderNotFound) {
		t.Errorf("expected ErrOrderNotFound, got %v", err)
	}
	if len(mockBroadcaster.broadcasts) != 0 {
		t.Errorf("expected 0 broadcasts on error, got %d", len(mockBroadcaster.broadcasts))
	}
}

func TestOrderService_CancelOrder_NotPending(t *testing.T) {
	mockRepo := &mockOrderRepo{
		cancelOrderFunc: func(ctx context.Context, orderID uuid.UUID, userID uuid.UUID) ([]uuid.UUID, error) {
			return nil, utils.ErrOrderNotPending
		},
	}
	mockBroadcaster := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, &mockQueueRepo{}, mockBroadcaster)

	err := orderService.CancelOrder(context.Background(), uuid.New(), uuid.New())
	if err == nil {
		t.Fatal("expected error for order not pending, got nil")
	}
	if !errors.Is(err, utils.ErrOrderNotPending) {
		t.Errorf("expected ErrOrderNotPending, got %v", err)
	}
}
