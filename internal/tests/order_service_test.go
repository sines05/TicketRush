package tests

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/service"
)

type mockOrderRepo struct {
	lockSeatsFunc     func(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error)
	completeOrderFunc func(ctx context.Context, orderID uuid.UUID) (*models.Order, error)
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
func (m *mockOrderRepo) GetTicketsByUserID(userID uuid.UUID) ([]models.Ticket, error) { return nil, nil }

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

	orderService := service.NewOrderService(mockRepo, mockBroadcaster)

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

	orderService := service.NewOrderService(mockRepo, mockBroadcaster)

	_, err := orderService.Checkout(context.Background(), uuid.New())
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
