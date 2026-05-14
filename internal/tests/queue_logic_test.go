package tests

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"ticketrush/internal/models"
	"ticketrush/internal/queue"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
	"ticketrush/internal/worker"
)

// Stateful Mock for Queue Repository
type statefulQueueRepo struct {
	activeUsers map[string]bool
	sessions    map[string]*queue.QueueSession
}

func newStatefulQueueRepo() *statefulQueueRepo {
	return &statefulQueueRepo{
		activeUsers: make(map[string]bool),
		sessions:    make(map[string]*queue.QueueSession),
	}
}

func (m *statefulQueueRepo) AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID, priority int) error {
	return nil
}
func (m *statefulQueueRepo) GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *statefulQueueRepo) IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error) {
	return m.activeUsers[userID.String()], nil
}
func (m *statefulQueueRepo) AllowUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	m.activeUsers[userID.String()] = true
	return nil
}
func (m *statefulQueueRepo) PopFromQueue(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, error) {
	return nil, nil
}
func (m *statefulQueueRepo) GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error) {
	return int64(len(m.activeUsers)), nil
}
func (m *statefulQueueRepo) RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	delete(m.activeUsers, userID.String())
	return nil
}
func (m *statefulQueueRepo) SaveSession(ctx context.Context, session *queue.QueueSession, expiration time.Duration) error {
	m.sessions[session.Token] = session
	return nil
}
func (m *statefulQueueRepo) GetSession(ctx context.Context, token string) (*queue.QueueSession, error) {
	return m.sessions[token], nil
}
func (m *statefulQueueRepo) GetSessionByEventAndUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (*queue.QueueSession, error) {
	for _, s := range m.sessions {
		if s.EventID == eventID && s.UserID == userID {
			return s, nil
		}
	}
	return nil, nil
}
func (m *statefulQueueRepo) ListSessions(ctx context.Context) ([]*queue.QueueSession, error) {
	var sessions []*queue.QueueSession
	for _, s := range m.sessions {
		sessions = append(sessions, s)
	}
	return sessions, nil
}
func (m *statefulQueueRepo) DeleteSession(ctx context.Context, token string, eventID uuid.UUID, userID uuid.UUID) error {
	delete(m.sessions, token)
	return nil
}

// Stateful Mock for Order Repository
type statefulOrderRepo struct {
	orders map[uuid.UUID]*models.Order
}

func newStatefulOrderRepo() *statefulOrderRepo {
	return &statefulOrderRepo{
		orders: make(map[uuid.UUID]*models.Order),
	}
}

func (m *statefulOrderRepo) LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error) {
	order := &models.Order{
		BaseModel: models.BaseModel{ID: uuid.New()},
		UserID:    userID,
		EventID:   eventID,
		Status:    models.OrderPending,
	}
	m.orders[order.ID] = order
	return order, nil
}
func (m *statefulOrderRepo) CompleteOrder(ctx context.Context, orderID uuid.UUID) (*models.Order, error) {
	order := m.orders[orderID]
	if order == nil {
		return nil, utils.ErrOrderNotFound
	}
	order.Status = models.OrderCompleted
	return order, nil
}
func (m *statefulOrderRepo) CancelOrder(ctx context.Context, orderID uuid.UUID, userID uuid.UUID) ([]uuid.UUID, error) {
	order := m.orders[orderID]
	if order == nil {
		return nil, utils.ErrOrderNotFound
	}
	order.Status = models.OrderCancelled
	return []uuid.UUID{uuid.New()}, nil
}
func (m *statefulOrderRepo) GetOrderByID(id uuid.UUID) (*models.Order, error) {
	return m.orders[id], nil
}
func (m *statefulOrderRepo) FindPendingOrderByUserAndEvent(ctx context.Context, userID uuid.UUID, eventID uuid.UUID) (*models.Order, error) {
	for _, o := range m.orders {
		if o.UserID == userID && o.EventID == eventID && o.Status == models.OrderPending {
			return o, nil
		}
	}
	return nil, nil
}
func (m *statefulOrderRepo) GetExpiredOrders(limit int) ([]models.Order, error) { return nil, nil }
func (m *statefulOrderRepo) ReleaseOrder(ctx context.Context, orderID uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (m *statefulOrderRepo) GetTicketsByUserID(userID uuid.UUID) ([]models.Ticket, error) { return nil, nil }
func (m *statefulOrderRepo) GetTicketsByEventID(eventID *uuid.UUID) ([]models.Ticket, error) { return nil, nil }
func (m *statefulOrderRepo) GetTicketsByOrderID(orderID uuid.UUID) ([]models.Ticket, error) { return nil, nil }
func (m *statefulOrderRepo) CheckInTicket(ctx context.Context, qrCodeToken string) (*models.Ticket, error) { return nil, nil }
func (m *statefulOrderRepo) GetRevenueStats(ctx context.Context, eventID *uuid.UUID) (float64, int64, error) { return 0, 0, nil }

type manualEventRepo struct {
	mockEventRepo
	event *models.Event
}

func (m *manualEventRepo) GetEventByID(id uuid.UUID) (*models.Event, error) {
	return m.event, nil
}

func TestQueueLifecycleIntegration(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	eventID := uuid.New()

	// Setup Repos
	queueRepo := newStatefulQueueRepo()
	orderRepo := newStatefulOrderRepo()
	eventRepo := &manualEventRepo{event: &models.Event{BaseModel: models.BaseModel{ID: eventID}, IsQueueMode: true}}
	userRepo := &mockUserRepo{}

	// Setup Services
	queueSvc := queue.NewService(queueRepo, userRepo)
	orderSvc := service.NewOrderService(orderRepo, eventRepo, queueRepo, &mockBroadcaster{}, &mockNotifier{}, userRepo)

	// 1. Join Queue (status allowed)
	// For simplicity, we'll manually allow the user or use a high priority user
	// Let's just manually allow them to simulate being at the front of the queue
	queueRepo.AllowUser(ctx, eventID, userID)
	
	status, token, _, err := queueSvc.JoinQueue(ctx, eventID, userID)
	assert.NoError(t, err)
	assert.Equal(t, "allowed", status)
	assert.NotEmpty(t, token)

	// 2. Lock Seats (creates PENDING order)
	order, err := orderSvc.LockSeats(ctx, userID, eventID, []uuid.UUID{uuid.New()}, token)
	assert.NoError(t, err)
	assert.NotNil(t, order)
	assert.Equal(t, models.OrderPending, order.Status)

	// Verify session exists
	session, err := queueRepo.GetSession(ctx, token)
	assert.NoError(t, err)
	assert.NotNil(t, session)

	// 3. Cancel Order (should NOT remove user from active set and NOT delete session)
	err = orderSvc.CancelOrder(ctx, userID, order.ID)
	assert.NoError(t, err)

	// Verify user STILL in active
	allowed, _ := queueRepo.IsAllowed(ctx, eventID, userID)
	assert.True(t, allowed, "User should STILL be in active set after cancellation")

	// Verify session STILL exists
	session, err = queueRepo.GetSession(ctx, token)
	assert.NotNil(t, session, "Session should STILL exist after cancellation")

	// 4. Join Queue again (should return the SAME session)
	status2, token2, _, err := queueSvc.JoinQueue(ctx, eventID, userID)
	assert.NoError(t, err)
	assert.Equal(t, "allowed", status2)
	assert.Equal(t, token, token2, "Should get the SAME token")

	// 5. Repeat for Checkout (Join -> Lock -> Checkout -> Join)
	order2, err := orderSvc.LockSeats(ctx, userID, eventID, []uuid.UUID{uuid.New()}, token2)
	assert.NoError(t, err)
	
	_, err = orderSvc.Checkout(ctx, userID, order2.ID)
	assert.NoError(t, err)

	// Verify user removed from active
	allowed, _ = queueRepo.IsAllowed(ctx, eventID, userID)
	assert.False(t, allowed, "User should be removed from active set after checkout")

	// Verify session deleted
	session, err = queueRepo.GetSession(ctx, token2)
	assert.Nil(t, session, "Session should be deleted after checkout")
}

func TestProactiveOrderCleanup(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	eventID := uuid.New()

	// Setup Repos
	queueRepo := newStatefulQueueRepo()
	orderRepo := newStatefulOrderRepo()
	eventRepo := &manualEventRepo{event: &models.Event{BaseModel: models.BaseModel{ID: eventID}, IsQueueMode: true}}
	userRepo := &mockUserRepo{}

	// Setup Services
	orderSvc := service.NewOrderService(orderRepo, eventRepo, queueRepo, &mockBroadcaster{}, &mockNotifier{}, userRepo)

	// Manually allow user and create a session
	queueRepo.AllowUser(ctx, eventID, userID)
	token := "test-token"
	queueRepo.SaveSession(ctx, &queue.QueueSession{Token: token, UserID: userID, EventID: eventID, Status: "allowed"}, time.Hour)

	// 1. Lock seats first time
	order1, err := orderSvc.LockSeats(ctx, userID, eventID, []uuid.UUID{uuid.New()}, token)
	assert.NoError(t, err)
	assert.Equal(t, models.OrderPending, order1.Status)

	// 2. Lock seats second time (should cancel order1)
	order2, err := orderSvc.LockSeats(ctx, userID, eventID, []uuid.UUID{uuid.New()}, token)
	assert.NoError(t, err)
	assert.NotNil(t, order2)
	assert.NotEqual(t, order1.ID, order2.ID)

	// Verify order1 is cancelled
	o1, _ := orderRepo.GetOrderByID(order1.ID)
	assert.Equal(t, models.OrderCancelled, o1.Status, "Previous pending order should be cancelled")
}

func TestTimerImmutability(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	eventID := uuid.New()

	queueRepo := newStatefulQueueRepo()
	userRepo := &mockUserRepo{}
	queueSvc := queue.NewService(queueRepo, userRepo)
	orderRepo := newStatefulOrderRepo()
	eventRepo := &manualEventRepo{event: &models.Event{BaseModel: models.BaseModel{ID: eventID}, IsQueueMode: true}}
	orderSvc := service.NewOrderService(orderRepo, eventRepo, queueRepo, &mockBroadcaster{}, &mockNotifier{}, userRepo)

	// 1. Admit user
	queueRepo.AllowUser(ctx, eventID, userID)
	status, token, allowedAt, err := queueSvc.JoinQueue(ctx, eventID, userID)
	assert.NoError(t, err)
	assert.Equal(t, "allowed", status)
	assert.NotNil(t, allowedAt)
	originalAllowedAt := *allowedAt

	// 2. Call JoinQueue again - AllowedAt should be the same
	time.Sleep(10 * time.Millisecond)
	_, _, allowedAt2, _ := queueSvc.JoinQueue(ctx, eventID, userID)
	assert.Equal(t, originalAllowedAt, *allowedAt2)

	// 3. Lock seats - AllowedAt should be the same
	_, err = orderSvc.LockSeats(ctx, userID, eventID, []uuid.UUID{uuid.New()}, token)
	assert.NoError(t, err)
	session, _ := queueRepo.GetSession(ctx, token)
	assert.Equal(t, originalAllowedAt, *session.AllowedAt)

	// 4. GetStatus - AllowedAt should be the same
	_, _, _, allowedAt3, _ := queueSvc.GetStatus(ctx, eventID, userID)
	assert.Equal(t, originalAllowedAt, *allowedAt3)
}

func TestSeatChangeSlot(t *testing.T) {
	ctx := context.Background()
	userA := uuid.New()
	userB := uuid.New()
	eventID := uuid.New()

	queueRepo := newStatefulQueueRepo()
	userRepo := &mockUserRepo{}
	orderRepo := newStatefulOrderRepo()
	eventRepo := &manualEventRepo{event: &models.Event{BaseModel: models.BaseModel{ID: eventID}, IsQueueMode: true}}
	orderSvc := service.NewOrderService(orderRepo, eventRepo, queueRepo, &mockBroadcaster{}, &mockNotifier{}, userRepo)

	// Admit User A and User B
	queueRepo.AllowUser(ctx, eventID, userA)
	queueRepo.AllowUser(ctx, eventID, userB)

	tokenA := "token-a"
	queueRepo.SaveSession(ctx, &queue.QueueSession{Token: tokenA, UserID: userA, EventID: eventID, Status: "allowed"}, time.Hour)

	// User A locks seats
	_, err := orderSvc.LockSeats(ctx, userA, eventID, []uuid.UUID{uuid.New()}, tokenA)
	assert.NoError(t, err)

	// User A locks DIFFERENT seats (proactive cleanup triggers)
	_, err = orderSvc.LockSeats(ctx, userA, eventID, []uuid.UUID{uuid.New()}, tokenA)
	assert.NoError(t, err)

	// Verify User A is STILL in the active set
	allowed, _ := queueRepo.IsAllowed(ctx, eventID, userA)
	assert.True(t, allowed, "User A should still be allowed after seat change")

	// Verify active count is still 2
	count, _ := queueRepo.GetCurrentActiveCount(ctx, eventID)
	assert.Equal(t, int64(2), count)
}

func TestZombieCleanupRobustness(t *testing.T) {
	ctx := context.Background()
	eventID := uuid.New()

	queueRepo := newStatefulQueueRepo()
	orderRepo := newStatefulOrderRepo()
	workerSvc := worker.NewWorkerService(nil, nil, queueRepo, nil, orderRepo)

	oldTime := time.Now().UTC().Add(-16 * time.Minute)

	// Scenario A: OrderID is nil
	userA := uuid.New()
	tokenA := "token-a"
	queueRepo.AllowUser(ctx, eventID, userA)
	queueRepo.SaveSession(ctx, &queue.QueueSession{
		Token:     tokenA,
		UserID:    userA,
		EventID:   eventID,
		Status:    "allowed",
		AllowedAt: &oldTime,
	}, time.Hour)

	// Scenario B: OrderID points to a CANCELLED order
	userB := uuid.New()
	tokenB := "token-b"
	orderB := &models.Order{BaseModel: models.BaseModel{ID: uuid.New()}, Status: models.OrderCancelled}
	orderRepo.orders[orderB.ID] = orderB
	queueRepo.AllowUser(ctx, eventID, userB)
	queueRepo.SaveSession(ctx, &queue.QueueSession{
		Token:     tokenB,
		UserID:    userB,
		EventID:   eventID,
		Status:    "allowed",
		AllowedAt: &oldTime,
		OrderID:   &orderB.ID,
	}, time.Hour)

	// Scenario C: OrderID points to a COMPLETED order
	userC := uuid.New()
	tokenC := "token-c"
	orderC := &models.Order{BaseModel: models.BaseModel{ID: uuid.New()}, Status: models.OrderCompleted}
	orderRepo.orders[orderC.ID] = orderC
	queueRepo.AllowUser(ctx, eventID, userC)
	queueRepo.SaveSession(ctx, &queue.QueueSession{
		Token:     tokenC,
		UserID:    userC,
		EventID:   eventID,
		Status:    "allowed",
		AllowedAt: &oldTime,
		OrderID:   &orderC.ID,
	}, time.Hour)

	// Scenario D: OrderID points to a PENDING order
	userD := uuid.New()
	tokenD := "token-d"
	orderD := &models.Order{BaseModel: models.BaseModel{ID: uuid.New()}, Status: models.OrderPending}
	orderRepo.orders[orderD.ID] = orderD
	queueRepo.AllowUser(ctx, eventID, userD)
	queueRepo.SaveSession(ctx, &queue.QueueSession{
		Token:     tokenD,
		UserID:    userD,
		EventID:   eventID,
		Status:    "allowed",
		AllowedAt: &oldTime,
		OrderID:   &orderD.ID,
	}, time.Hour)

	// Run cleanup
	workerSvc.ReleaseExpiredSessions()

	// Verify A, B, C are deleted, D remains
	sessionA, _ := queueRepo.GetSession(ctx, tokenA)
	assert.Nil(t, sessionA, "Session A (no order) should be cleaned up")
	allowedA, _ := queueRepo.IsAllowed(ctx, eventID, userA)
	assert.False(t, allowedA)

	sessionB, _ := queueRepo.GetSession(ctx, tokenB)
	assert.Nil(t, sessionB, "Session B (cancelled order) should be cleaned up")
	allowedB, _ := queueRepo.IsAllowed(ctx, eventID, userB)
	assert.False(t, allowedB)

	sessionC, _ := queueRepo.GetSession(ctx, tokenC)
	assert.Nil(t, sessionC, "Session C (completed order) should be cleaned up")
	allowedC, _ := queueRepo.IsAllowed(ctx, eventID, userC)
	assert.False(t, allowedC)

	sessionD, _ := queueRepo.GetSession(ctx, tokenD)
	assert.NotNil(t, sessionD, "Session D (pending order) should NOT be cleaned up")
	allowedD, _ := queueRepo.IsAllowed(ctx, eventID, userD)
	assert.True(t, allowedD)
}
