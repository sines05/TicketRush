package tests

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"ticketrush/internal/service"
)

// --- Mock QueueRepository for Queue Service Tests ---
type mockQueueRepoForService struct {
	allowedUsers map[string]bool // eventID:userID -> bool
	queue        []string        // ordered list of userIDs
	activeCount  int64
}

func newMockQueueRepoForService() *mockQueueRepoForService {
	return &mockQueueRepoForService{
		allowedUsers: make(map[string]bool),
	}
}

func (m *mockQueueRepoForService) key(eventID, userID uuid.UUID) string {
	return eventID.String() + ":" + userID.String()
}

func (m *mockQueueRepoForService) AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	m.queue = append(m.queue, userID.String())
	return nil
}

func (m *mockQueueRepoForService) GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error) {
	for i, uid := range m.queue {
		if uid == userID.String() {
			return int64(i), nil
		}
	}
	return -1, nil
}

func (m *mockQueueRepoForService) IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error) {
	return m.allowedUsers[m.key(eventID, userID)], nil
}

func (m *mockQueueRepoForService) AllowUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	m.allowedUsers[m.key(eventID, userID)] = true
	// Remove from queue
	for i, uid := range m.queue {
		if uid == userID.String() {
			m.queue = append(m.queue[:i], m.queue[i+1:]...)
			break
		}
	}
	m.activeCount++
	return nil
}

func (m *mockQueueRepoForService) PopFromQueue(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, error) {
	end := count
	if end > len(m.queue) {
		end = len(m.queue)
	}
	var result []uuid.UUID
	for _, uid := range m.queue[:end] {
		id, _ := uuid.Parse(uid)
		result = append(result, id)
	}
	return result, nil
}

func (m *mockQueueRepoForService) GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error) {
	return m.activeCount, nil
}

func (m *mockQueueRepoForService) RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	delete(m.allowedUsers, m.key(eventID, userID))
	if m.activeCount > 0 {
		m.activeCount--
	}
	return nil
}

// ============================================================
// Tests: Queue Service - JoinQueue
// ============================================================

func TestJoinQueue_NewUser_ReturnsWaiting(t *testing.T) {
	mockRepo := newMockQueueRepoForService()
	queueService := service.NewQueueService(mockRepo)

	eventID := uuid.New()
	userID := uuid.New()

	status, err := queueService.JoinQueue(context.Background(), eventID, userID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if status != "waiting" {
		t.Fatalf("expected status 'waiting', got '%s'", status)
	}
}

func TestJoinQueue_AlreadyAllowed_ReturnsAllowed(t *testing.T) {
	mockRepo := newMockQueueRepoForService()
	queueService := service.NewQueueService(mockRepo)

	eventID := uuid.New()
	userID := uuid.New()

	// Pre-allow the user
	mockRepo.allowedUsers[mockRepo.key(eventID, userID)] = true

	status, err := queueService.JoinQueue(context.Background(), eventID, userID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if status != "allowed" {
		t.Fatalf("expected status 'allowed', got '%s'", status)
	}
}

// ============================================================
// Tests: Queue Service - GetStatus
// ============================================================

func TestGetStatus_AllowedUser(t *testing.T) {
	mockRepo := newMockQueueRepoForService()
	queueService := service.NewQueueService(mockRepo)

	eventID := uuid.New()
	userID := uuid.New()
	mockRepo.allowedUsers[mockRepo.key(eventID, userID)] = true

	status, pos, err := queueService.GetStatus(context.Background(), eventID, userID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if status != "allowed" {
		t.Fatalf("expected 'allowed', got '%s'", status)
	}
	if pos != 0 {
		t.Fatalf("expected position 0 for allowed user, got %d", pos)
	}
}

func TestGetStatus_WaitingUser(t *testing.T) {
	mockRepo := newMockQueueRepoForService()
	queueService := service.NewQueueService(mockRepo)

	eventID := uuid.New()
	userID := uuid.New()
	mockRepo.queue = append(mockRepo.queue, userID.String())

	status, pos, err := queueService.GetStatus(context.Background(), eventID, userID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if status != "waiting" {
		t.Fatalf("expected 'waiting', got '%s'", status)
	}
	if pos != 1 { // position is 1-indexed
		t.Fatalf("expected position 1, got %d", pos)
	}
}

// ============================================================
// Tests: Queue Service - ProcessQueue
// ============================================================

func TestProcessQueue_AdmitsUsersUpToThreshold(t *testing.T) {
	mockRepo := newMockQueueRepoForService()
	queueService := service.NewQueueService(mockRepo)

	eventID := uuid.New()

	// Add 5 users to queue
	users := make([]uuid.UUID, 5)
	for i := 0; i < 5; i++ {
		users[i] = uuid.New()
		mockRepo.queue = append(mockRepo.queue, users[i].String())
	}

	// Process the queue (threshold is 100, active is 0, so all 5 should be admitted)
	err := queueService.ProcessQueue(context.Background(), eventID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// All 5 users should be in active set
	for _, userID := range users {
		allowed, _ := mockRepo.IsAllowed(context.Background(), eventID, userID)
		if !allowed {
			t.Errorf("expected user %s to be allowed after ProcessQueue", userID)
		}
	}
}

func TestProcessQueue_StopsAtThreshold(t *testing.T) {
	mockRepo := newMockQueueRepoForService()
	queueService := service.NewQueueService(mockRepo)

	eventID := uuid.New()

	// Set active count to threshold (100)
	mockRepo.activeCount = 100

	// Add a user to queue
	userID := uuid.New()
	mockRepo.queue = append(mockRepo.queue, userID.String())

	err := queueService.ProcessQueue(context.Background(), eventID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// User should NOT be admitted because threshold is reached
	allowed, _ := mockRepo.IsAllowed(context.Background(), eventID, userID)
	if allowed {
		t.Error("expected user to NOT be allowed when threshold is reached")
	}
}
