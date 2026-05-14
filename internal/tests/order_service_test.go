package tests

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/queue"
	"ticketrush/internal/repository"
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

func (m *mockOrderRepo) GetOrderByID(id uuid.UUID) (*models.Order, error) {
	return &models.Order{
		BaseModel: models.BaseModel{ID: id},
		EventID:   uuid.New(),
	}, nil
}

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
func (m *mockOrderRepo) GetTicketsByUserID(userID uuid.UUID) ([]models.Ticket, error) {
	return nil, nil
}
func (m *mockOrderRepo) GetTicketsByEventID(eventID *uuid.UUID) ([]models.Ticket, error) {
	return nil, nil
}
func (m *mockOrderRepo) CheckInTicket(ctx context.Context, qrCodeToken string) (*models.Ticket, error) {
	return nil, nil
}
func (m *mockOrderRepo) GetTicketsByOrderID(orderID uuid.UUID) ([]models.Ticket, error) {
	return nil, nil
}
func (m *mockOrderRepo) GetRevenueStats(ctx context.Context, eventID *uuid.UUID) (float64, int64, error) {
	return 0, 0, nil
}

// mockQueueRepo always returns "allowed" so LockSeats can proceed
type mockQueueRepo struct{}

func (m *mockQueueRepo) AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID, priorityLevel int) error {
	return nil
}
func (m *mockQueueRepo) GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockQueueRepo) IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error) {
	return true, nil
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
	return nil
}
func (m *mockQueueRepo) SaveSession(ctx context.Context, session *queue.QueueSession, expiration time.Duration) error {
	return nil
}
func (m *mockQueueRepo) GetSession(ctx context.Context, token string) (*queue.QueueSession, error) {
	return nil, nil
}
func (m *mockQueueRepo) GetSessionByEventAndUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (*queue.QueueSession, error) {
	return nil, nil
}
func (m *mockQueueRepo) ListSessions(ctx context.Context) ([]*queue.QueueSession, error) {
	return nil, nil
}
func (m *mockQueueRepo) DeleteSession(ctx context.Context, token string, eventID uuid.UUID, userID uuid.UUID) error {
	return nil
}

type mockEventRepo struct{}

func (m *mockEventRepo) CreateEvent(event *models.Event) error { return nil }
func (m *mockEventRepo) GetEventByID(id uuid.UUID) (*models.Event, error) {
	return &models.Event{}, nil
}
func (m *mockEventRepo) GetEventBySlug(slug string) (*models.Event, error) { return nil, nil }
func (m *mockEventRepo) GetAllEvents(filter repository.EventFilter) ([]repository.EventSearchResult, error) {
	return nil, nil
}
func (m *mockEventRepo) GetFeaturedEvents(limit int) ([]models.Event, error) { return nil, nil }
func (m *mockEventRepo) GetHeroEvents(limit int) ([]models.Event, error)     { return nil, nil }
func (m *mockEventRepo) GetTrendingTicketStats(limit int, since time.Time) ([]repository.EventTrendingTicketStats, error) {
	return nil, nil
}
func (m *mockEventRepo) UpdateEvent(event *models.Event) error { return nil }
func (m *mockEventRepo) DeleteEvent(id uuid.UUID) error        { return nil }
func (m *mockEventRepo) GetSeatMap(eventID uuid.UUID) ([]models.EventZone, error) {
	return nil, nil
}
func (m *mockEventRepo) GetTotalSeats(ctx context.Context, eventID uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockEventRepo) GetSimilarEvents(ctx context.Context, eventID uuid.UUID, category string, limit int) ([]models.Event, error) {
	return nil, nil
}

type mockNotifier struct{}

func (m *mockNotifier) NotifyTicketPurchased(user *models.User, tickets []models.Ticket, event *models.Event) {
}
func (m *mockNotifier) NotifyWelcome(user *models.User)                                {}
func (m *mockNotifier) NotifyOrderConfirmation(user *models.User, order *models.Order) {}
func (m *mockNotifier) NotifySecurityEvent(user *models.User, eventName string)        {}
func (m *mockNotifier) SendSystemNotification(userID uuid.UUID, title, message string) {}
func (m *mockNotifier) StartWorker()                                                   {}

type mockUserRepo struct{}

func (m *mockUserRepo) Create(user *models.User) error                                { return nil }
func (m *mockUserRepo) FindByEmail(email string) (*models.User, error)                { return nil, nil }
func (m *mockUserRepo) FindByID(id uuid.UUID) (*models.User, error)                   { return &models.User{}, nil }
func (m *mockUserRepo) Update(user *models.User) error                                { return nil }
func (m *mockUserRepo) UpdatePassword(userID uuid.UUID, newPasswordHash string) error { return nil }
func (m *mockUserRepo) CreatePasswordReset(reset *models.PasswordReset) error         { return nil }
func (m *mockUserRepo) FindPasswordResetByToken(token string) (*models.PasswordReset, error) {
	return nil, nil
}
func (m *mockUserRepo) DeletePasswordReset(token string) error                        { return nil }
func (m *mockUserRepo) Update2FA(userID uuid.UUID, enabled bool, secret string) error { return nil }
func (m *mockUserRepo) UpdateNotificationToken(userID uuid.UUID, token string) error  { return nil }
func (m *mockUserRepo) FindAll() ([]models.User, error)                               { return nil, nil }
func (m *mockUserRepo) UpdateRole(userID uuid.UUID, role models.UserRole) error       { return nil }
func (m *mockUserRepo) UpdateMembership(userID uuid.UUID, tierID *uuid.UUID) error    { return nil }
func (m *mockUserRepo) Delete(userID uuid.UUID) error                                 { return nil }

// MockBroadcaster
type mockBroadcaster struct {
	broadcasts []interface{}
}

func (m *mockBroadcaster) Broadcast(channel string, data interface{}) {
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

	orderService := service.NewOrderService(mockRepo, &mockEventRepo{}, &mockQueueRepo{}, mockBroadcaster, &mockNotifier{}, &mockUserRepo{})

	seatID := uuid.New()
	_, err := orderService.LockSeats(context.Background(), uuid.New(), uuid.New(), []uuid.UUID{seatID}, "")
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

	if msg["type"] != "SEATS_LOCKED" {
		t.Errorf("expected type SEATS_LOCKED, got %v", msg["type"])
	}

	seatIDs, ok := msg["seat_ids"].([]uuid.UUID)
	if !ok || len(seatIDs) != 1 || seatIDs[0] != seatID {
		t.Errorf("expected seat_ids [%v], got %v", seatID, msg["seat_ids"])
	}
}

func TestOrderService_Checkout_Broadcast(t *testing.T) {
	seatID := uuid.New()
	eventID := uuid.New()
	mockRepo := &mockOrderRepo{
		completeOrderFunc: func(ctx context.Context, orderID uuid.UUID) (*models.Order, error) {
			// Mock successful checkout
			return &models.Order{
				BaseModel: models.BaseModel{ID: orderID},
				EventID:   eventID,
				OrderItems: []models.OrderItem{
					{SeatID: seatID},
				},
			}, nil
		},
	}
	mockBroadcaster := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, &mockEventRepo{}, &mockQueueRepo{}, mockBroadcaster, &mockNotifier{}, &mockUserRepo{})

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

	if msg["type"] != "SEATS_SOLD" {
		t.Errorf("expected type SEATS_SOLD, got %v", msg["type"])
	}

	seatIDs, ok := msg["seat_ids"].([]uuid.UUID)
	if !ok || len(seatIDs) != 1 || seatIDs[0] != seatID {
		t.Errorf("expected seat_ids [%v], got %v", seatID, msg["seat_ids"])
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

	orderService := service.NewOrderService(mockRepo, &mockEventRepo{}, &mockQueueRepo{}, mockBroadcaster, &mockNotifier{}, &mockUserRepo{})

	err := orderService.CancelOrder(context.Background(), userID, uuid.New())
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
	if msg["type"] != "SEATS_RELEASED" {
		t.Errorf("expected type SEATS_RELEASED, got %v", msg["type"])
	}

	returnedSeatIDs, ok := msg["seat_ids"].([]uuid.UUID)
	if !ok || len(returnedSeatIDs) != len(seatIDs) {
		t.Errorf("expected %d seat_ids, got %v", len(seatIDs), msg["seat_ids"])
	}
}

func TestOrderService_CancelOrder_NotFound(t *testing.T) {
	mockRepo := &mockOrderRepo{
		cancelOrderFunc: func(ctx context.Context, orderID uuid.UUID, userID uuid.UUID) ([]uuid.UUID, error) {
			return nil, utils.ErrOrderNotFound
		},
	}
	mockBroadcaster := &mockBroadcaster{}

	orderService := service.NewOrderService(mockRepo, &mockEventRepo{}, &mockQueueRepo{}, mockBroadcaster, &mockNotifier{}, &mockUserRepo{})

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

	orderService := service.NewOrderService(mockRepo, &mockEventRepo{}, &mockQueueRepo{}, mockBroadcaster, &mockNotifier{}, &mockUserRepo{})

	err := orderService.CancelOrder(context.Background(), uuid.New(), uuid.New())
	if err == nil {
		t.Fatal("expected error for order not pending, got nil")
	}
	if !errors.Is(err, utils.ErrOrderNotPending) {
		t.Errorf("expected ErrOrderNotPending, got %v", err)
	}
}
