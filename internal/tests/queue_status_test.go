package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"ticketrush/internal/handler"
	"ticketrush/internal/models"
	"ticketrush/internal/queue"
)

// queueStatusMockRepo is a specialized mock for testing queue position and processed index.
type queueStatusMockRepo struct {
	sessions       map[string]*queue.QueueSession
	counters       map[string]int64
	processedIndex map[string]int64
	queue          map[string][]uuid.UUID
}

func newQueueStatusMockRepo() *queueStatusMockRepo {
	return &queueStatusMockRepo{
		sessions:       make(map[string]*queue.QueueSession),
		counters:       make(map[string]int64),
		processedIndex: make(map[string]int64),
		queue:          make(map[string][]uuid.UUID),
	}
}

func (m *queueStatusMockRepo) AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID, priority int) error {
	eid := eventID.String()
	m.queue[eid] = append(m.queue[eid], userID)
	return nil
}

func (m *queueStatusMockRepo) GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error) {
	eid := eventID.String()
	for i, id := range m.queue[eid] {
		if id == userID {
			return int64(i), nil
		}
	}
	return -1, nil
}

func (m *queueStatusMockRepo) IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error) {
	return false, nil
}

func (m *queueStatusMockRepo) AllowUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	return nil
}

func (m *queueStatusMockRepo) PopFromQueue(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, error) {
	return nil, nil
}

func (m *queueStatusMockRepo) PopFromQueueAndIncrementProcessedIndex(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, int64, error) {
	eid := eventID.String()
	q := m.queue[eid]
	if len(q) == 0 {
		return nil, m.processedIndex[eid], nil
	}
	
	toPop := count
	if len(q) < count {
		toPop = len(q)
	}
	
	popped := q[:toPop]
	m.queue[eid] = q[toPop:]
	m.processedIndex[eid] += int64(toPop)
	
	return popped, m.processedIndex[eid], nil
}

func (m *queueStatusMockRepo) GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error) {
	return 0, nil
}

func (m *queueStatusMockRepo) RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	return nil
}

func (m *queueStatusMockRepo) GetNextJoinIndex(ctx context.Context, eventID uuid.UUID) (int64, error) {
	eid := eventID.String()
	m.counters[eid]++
	return m.counters[eid], nil
}

func (m *queueStatusMockRepo) GetProcessedIndex(ctx context.Context, eventID uuid.UUID) (int64, error) {
	return m.processedIndex[eventID.String()], nil
}

func (m *queueStatusMockRepo) IncrementProcessedIndex(ctx context.Context, eventID uuid.UUID, count int) (int64, error) {
	eid := eventID.String()
	m.processedIndex[eid] += int64(count)
	return m.processedIndex[eid], nil
}

func (m *queueStatusMockRepo) SaveSession(ctx context.Context, session *queue.QueueSession, expiration time.Duration) error {
	m.sessions[session.Token] = session
	return nil
}

func (m *queueStatusMockRepo) GetSession(ctx context.Context, token string) (*queue.QueueSession, error) {
	return m.sessions[token], nil
}

func (m *queueStatusMockRepo) GetSessionByEventAndUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (*queue.QueueSession, error) {
	for _, s := range m.sessions {
		if s.EventID == eventID && s.UserID == userID {
			return s, nil
		}
	}
	return nil, nil
}

func (m *queueStatusMockRepo) ListSessions(ctx context.Context) ([]*queue.QueueSession, error) {
	return nil, nil
}

func (m *queueStatusMockRepo) GetExpiredSessions(ctx context.Context, limit int) ([]string, error) {
	return nil, nil
}

func (m *queueStatusMockRepo) DeleteSession(ctx context.Context, token string, eventID uuid.UUID, userID uuid.UUID) error {
	delete(m.sessions, token)
	return nil
}

func (m *queueStatusMockRepo) GetAllQueueUsers(ctx context.Context, eventID uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}

func (m *queueStatusMockRepo) GetOrCreateSessionAtomic(ctx context.Context, session *queue.QueueSession, expiration time.Duration, incrementJoinIndex bool) (*queue.QueueSession, bool, error) {
	existing, _ := m.GetSessionByEventAndUser(ctx, session.EventID, session.UserID)
	if existing != nil {
		return existing, false, nil
	}
	if incrementJoinIndex {
		eid := session.EventID.String()
		m.counters[eid]++
		session.JoinIndex = m.counters[eid]
	}
	m.sessions[session.Token] = session
	return session, true, nil
}

type queueStatusMockUserRepo struct{}

func (m *queueStatusMockUserRepo) Create(user *models.User) error                                { return nil }
func (m *queueStatusMockUserRepo) FindByEmail(email string) (*models.User, error)                { return nil, nil }
func (m *queueStatusMockUserRepo) FindByID(id uuid.UUID) (*models.User, error)                   { return &models.User{BaseModel: models.BaseModel{ID: id}}, nil }
func (m *queueStatusMockUserRepo) Update(user *models.User) error                                { return nil }
func (m *queueStatusMockUserRepo) UpdatePassword(userID uuid.UUID, newPasswordHash string) error { return nil }
func (m *queueStatusMockUserRepo) CreatePasswordReset(reset *models.PasswordReset) error         { return nil }
func (m *queueStatusMockUserRepo) FindPasswordResetByToken(token string) (*models.PasswordReset, error) {
	return nil, nil
}
func (m *queueStatusMockUserRepo) DeletePasswordReset(token string) error                        { return nil }
func (m *queueStatusMockUserRepo) Update2FA(userID uuid.UUID, enabled bool, secret string, recoveryCode string) error {
	return nil
}
func (m *queueStatusMockUserRepo) Update2FAPending(userID uuid.UUID, pendingSecret string, recoveryCodes string) error {
	return nil
}
func (m *queueStatusMockUserRepo) UpdateNotificationToken(userID uuid.UUID, token string) error  { return nil }
func (m *queueStatusMockUserRepo) FindAll() ([]models.User, error)                               { return nil, nil }
func (m *queueStatusMockUserRepo) UpdateRole(userID uuid.UUID, role models.UserRole) error       { return nil }
func (m *queueStatusMockUserRepo) UpdateMembership(userID uuid.UUID, tierID *uuid.UUID) error    { return nil }
func (m *queueStatusMockUserRepo) Delete(userID uuid.UUID) error                                 { return nil }

func TestQueueRelativePosition(t *testing.T) {
	ctx := context.Background()
	eventID := uuid.New()
	user1 := uuid.New()
	user2 := uuid.New()

	repo := newQueueStatusMockRepo()
	userRepo := &queueStatusMockUserRepo{}
	svc := queue.NewService(repo, userRepo)

	// 1. User 1 joins
	status1, _, joinIndex1, procIndex1, _, err := svc.JoinQueue(ctx, eventID, user1)
	assert.NoError(t, err)
	assert.Equal(t, "waiting", status1)
	assert.Equal(t, int64(1), joinIndex1)
	assert.Equal(t, int64(0), procIndex1)

	// 2. User 2 joins
	status2, _, joinIndex2, procIndex2, _, err := svc.JoinQueue(ctx, eventID, user2)
	assert.NoError(t, err)
	assert.Equal(t, "waiting", status2)
	assert.Equal(t, int64(2), joinIndex2)
	assert.Equal(t, int64(0), procIndex2)

	// 3. Simulate processing (some other users or User 1)
	repo.IncrementProcessedIndex(ctx, eventID, 1)

	// 4. Check status of User 2
	status2Check, joinIndex2Check, procIndex2Check, _, _, err := svc.GetStatus(ctx, eventID, user2)
	assert.NoError(t, err)
	assert.Equal(t, "waiting", status2Check)
	assert.Equal(t, int64(2), joinIndex2Check)
	assert.Equal(t, int64(1), procIndex2Check)
	
	// Relative position = joinIndex2Check - procIndex2Check = 2 - 1 = 1
	assert.Equal(t, int64(1), joinIndex2Check - procIndex2Check)
}

func TestQueueHandlerStatus(t *testing.T) {
	eventID := uuid.New()
	userID := uuid.New()
	user := &models.User{BaseModel: models.BaseModel{ID: userID}}

	repo := newQueueStatusMockRepo()
	userRepo := &queueStatusMockUserRepo{}
	
	svc := queue.NewService(repo, userRepo)
	h := handler.NewQueueHandler(svc)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user", user)
		c.Next()
	})
	r.POST("/queue/join", h.JoinQueue)
	r.GET("/queue/status", h.GetStatus)

	// 1. Join
	body, _ := json.Marshal(map[string]interface{}{"event_id": eventID})
	req, _ := http.NewRequest("POST", "/queue/join", bytes.NewBuffer(body))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp1 map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp1)
	data1 := resp1["data"].(map[string]interface{})
	assert.Equal(t, float64(1), data1["join_index"])
	assert.Equal(t, float64(0), data1["current_processed_index"])

	// 2. Increment counter
	repo.IncrementProcessedIndex(context.Background(), eventID, 5)

	// 3. Get Status
	req, _ = http.NewRequest("GET", "/queue/status?event_id="+eventID.String(), nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp2 map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp2)
	data2 := resp2["data"].(map[string]interface{})
	assert.Equal(t, float64(1), data2["join_index"])
	assert.Equal(t, float64(5), data2["current_processed_index"])
}
