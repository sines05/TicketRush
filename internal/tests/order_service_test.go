package tests

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
)

// --- Mock OrderRepository ---
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

func (m *mockOrderRepo) GetOrderByID(id uuid.UUID) (*models.Order, error)       { return nil, nil }
func (m *mockOrderRepo) GetExpiredOrders(limit int) ([]models.Order, error)      { return nil, nil }
func (m *mockOrderRepo) ReleaseOrder(ctx context.Context, orderID uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (m *mockOrderRepo) GetTicketsByUserID(userID uuid.UUID) ([]models.Ticket, error) {
	return nil, nil
}

// --- Mock QueueRepository ---
type mockQueueRepo struct {
	isAllowedResult     bool
	isAllowedErr        error
	removeFromActiveFn  func(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error
	removedFromActive   []string // track calls for assertions
}

func (m *mockQueueRepo) AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	return nil
}
func (m *mockQueueRepo) GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockQueueRepo) IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error) {
	return m.isAllowedResult, m.isAllowedErr
}
func (m *mockQueueRepo) AllowUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	return nil
}
func (m *mockQueueRepo) PopFromQueue(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, error) {
	return nil, nil
}
func (m *mockQueueRepo) GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockQueueRepo) RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	m.removedFromActive = append(m.removedFromActive, userID.String())
	if m.removeFromActiveFn != nil {
		return m.removeFromActiveFn(ctx, eventID, userID)
	}
	return nil
}

// --- Mock Broadcaster ---
type mockBroadcaster struct {
	broadcasts []interface{}
}

func (m *mockBroadcaster) Broadcast(data interface{}) {
	m.broadcasts = append(m.broadcasts, data)
}

// ============================================================
// Tests: Queue Enforcement on LockSeats
// ============================================================

func TestLockSeats_BlocksUserNotInQueue(t *testing.T) {
	mockRepo := &mockOrderRepo{}
	mockQueue := &mockQueueRepo{isAllowedResult: false}
	mockBC := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, mockQueue, mockBC)

	_, err := orderService.LockSeats(context.Background(), uuid.New(), uuid.New(), []uuid.UUID{uuid.New()})

	if err == nil {
		t.Fatal("expected error for unauthorized user, got nil")
	}
	if err != utils.ErrQueueNotAllowed {
		t.Fatalf("expected ErrQueueNotAllowed, got: %v", err)
	}
	if len(mockBC.broadcasts) != 0 {
		t.Fatalf("expected 0 broadcasts for rejected request, got %d", len(mockBC.broadcasts))
	}
}

func TestLockSeats_AllowsUserInQueue(t *testing.T) {
	seatID := uuid.New()
	mockRepo := &mockOrderRepo{
		lockSeatsFunc: func(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error) {
			return &models.Order{
				BaseModel:  models.BaseModel{ID: uuid.New()},
				OrderItems: []models.OrderItem{{SeatID: seatIDs[0]}},
			}, nil
		},
	}
	mockQueue := &mockQueueRepo{isAllowedResult: true}
	mockBC := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, mockQueue, mockBC)

	order, err := orderService.LockSeats(context.Background(), uuid.New(), uuid.New(), []uuid.UUID{seatID})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if order == nil {
		t.Fatal("expected order, got nil")
	}
	if len(mockBC.broadcasts) != 1 {
		t.Fatalf("expected 1 broadcast, got %d", len(mockBC.broadcasts))
	}

	msg := mockBC.broadcasts[0].(map[string]interface{})
	if msg["type"] != "SEAT_LOCKED" {
		t.Errorf("expected type SEAT_LOCKED, got %v", msg["type"])
	}
	if msg["seat_id"] != seatID {
		t.Errorf("expected seat_id %v, got %v", seatID, msg["seat_id"])
	}
}

func TestLockSeats_ReturnsRepoError(t *testing.T) {
	mockRepo := &mockOrderRepo{
		lockSeatsFunc: func(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error) {
			return nil, utils.ErrSeatAlreadyTaken
		},
	}
	mockQueue := &mockQueueRepo{isAllowedResult: true}
	mockBC := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, mockQueue, mockBC)

	_, err := orderService.LockSeats(context.Background(), uuid.New(), uuid.New(), []uuid.UUID{uuid.New()})

	if err != utils.ErrSeatAlreadyTaken {
		t.Fatalf("expected ErrSeatAlreadyTaken, got: %v", err)
	}
	if len(mockBC.broadcasts) != 0 {
		t.Fatalf("expected 0 broadcasts on failure, got %d", len(mockBC.broadcasts))
	}
}

// ============================================================
// Tests: Checkout broadcasts and removes from active set
// ============================================================

func TestCheckout_BroadcastsAndRemovesFromActive(t *testing.T) {
	seatID := uuid.New()
	eventID := uuid.New()
	userID := uuid.New()
	orderID := uuid.New()

	mockRepo := &mockOrderRepo{
		completeOrderFunc: func(ctx context.Context, oid uuid.UUID) (*models.Order, error) {
			return &models.Order{
				BaseModel:  models.BaseModel{ID: oid},
				UserID:     userID,
				EventID:    eventID,
				OrderItems: []models.OrderItem{{SeatID: seatID}},
			}, nil
		},
	}
	mockQueue := &mockQueueRepo{isAllowedResult: true}
	mockBC := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, mockQueue, mockBC)

	order, err := orderService.Checkout(context.Background(), userID, orderID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if order == nil {
		t.Fatal("expected order, got nil")
	}

	// Verify broadcast
	if len(mockBC.broadcasts) != 1 {
		t.Fatalf("expected 1 broadcast, got %d", len(mockBC.broadcasts))
	}
	msg := mockBC.broadcasts[0].(map[string]interface{})
	if msg["type"] != "SEAT_SOLD" {
		t.Errorf("expected type SEAT_SOLD, got %v", msg["type"])
	}

	// Verify user removed from active set
	if len(mockQueue.removedFromActive) != 1 {
		t.Fatalf("expected 1 RemoveFromActive call, got %d", len(mockQueue.removedFromActive))
	}
	if mockQueue.removedFromActive[0] != userID.String() {
		t.Errorf("expected removed user %s, got %s", userID, mockQueue.removedFromActive[0])
	}
}

func TestCheckout_FailureDoesNotRemoveFromActive(t *testing.T) {
	mockRepo := &mockOrderRepo{
		completeOrderFunc: func(ctx context.Context, oid uuid.UUID) (*models.Order, error) {
			return nil, utils.ErrOrderExpired
		},
	}
	mockQueue := &mockQueueRepo{isAllowedResult: true}
	mockBC := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, mockQueue, mockBC)

	_, err := orderService.Checkout(context.Background(), uuid.New(), uuid.New())
	if err != utils.ErrOrderExpired {
		t.Fatalf("expected ErrOrderExpired, got: %v", err)
	}

	if len(mockQueue.removedFromActive) != 0 {
		t.Fatalf("expected 0 RemoveFromActive calls on failure, got %d", len(mockQueue.removedFromActive))
	}
	if len(mockBC.broadcasts) != 0 {
		t.Fatalf("expected 0 broadcasts on failure, got %d", len(mockBC.broadcasts))
	}
}
