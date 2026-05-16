package tests

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"ticketrush/internal/models"
	"ticketrush/internal/service"
	"ticketrush/internal/websocket"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockAuthService implements service.AuthService for testing
type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Register(req service.RegisterRequest) (*models.User, error) {
	args := m.Called(req)
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockAuthService) Login(email, password string) (string, *models.User, bool, error) {
	args := m.Called(email, password)
	return args.String(0), args.Get(1).(*models.User), args.Bool(2), args.Error(3)
}

func (m *MockAuthService) ValidateToken(token string) (*models.User, bool, error) {
	args := m.Called(token)
	if args.Get(0) == nil {
		return nil, false, args.Error(2)
	}
	return args.Get(0).(*models.User), args.Bool(1), args.Error(2)
}

func (m *MockAuthService) ForgotPassword(email string) error {
	return m.Called(email).Error(0)
}

func (m *MockAuthService) ResetPassword(token, newPassword string) error {
	return m.Called(token, newPassword).Error(0)
}

func (m *MockAuthService) GoogleLoginURL(state string) string {
	return m.Called(state).String(0)
}

func (m *MockAuthService) GoogleLoginCallback(code string) (string, *models.User, error) {
	args := m.Called(code)
	return args.String(0), args.Get(1).(*models.User), args.Error(2)
}

func (m *MockAuthService) FacebookLoginURL(state string) string {
	return m.Called(state).String(0)
}

func (m *MockAuthService) FacebookLoginCallback(code string) (string, *models.User, error) {
	args := m.Called(code)
	return args.String(0), args.Get(1).(*models.User), args.Error(2)
}

func (m *MockAuthService) Generate2FA(userID uuid.UUID) (string, string, []string, error) {
	args := m.Called(userID)
	return args.String(0), args.String(1), args.Get(2).([]string), args.Error(3)
}

func (m *MockAuthService) Enable2FA(userID uuid.UUID, code string) error {
	return m.Called(userID, code).Error(0)
}

func (m *MockAuthService) Verify2FA(userID uuid.UUID, code string) (string, error) {
	args := m.Called(userID, code)
	return args.String(0), args.Error(1)
}

func (m *MockAuthService) UpdateNotificationToken(userID uuid.UUID, token string) error {
	return m.Called(userID, token).Error(0)
}

func (m *MockAuthService) UpdateProfile(userID uuid.UUID, fullName string, avatarURL string, gender models.GenderType, dob string) (*models.User, error) {
	args := m.Called(userID, fullName, avatarURL, gender, dob)
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockAuthService) ChangePassword(userID uuid.UUID, oldPassword string, newPassword string) error {
	return m.Called(userID, oldPassword, newPassword).Error(0)
}

func (m *MockAuthService) Disable2FA(userID uuid.UUID, code string) error {
	return m.Called(userID, code).Error(0)
}

func TestWebSocketSecurity(t *testing.T) {
	hub := websocket.NewHub()
	mockAuth := new(MockAuthService)

	t.Run("Handshake fails without Sec-WebSocket-Protocol header", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/ws", nil)
		w := httptest.NewRecorder()

		websocket.ServeWs(hub, mockAuth, w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Unauthorized")
	})

	t.Run("Handshake fails with invalid token in Sec-WebSocket-Protocol", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/ws", nil)
		req.Header.Set("Sec-WebSocket-Protocol", "invalid-token")
		w := httptest.NewRecorder()

		mockAuth.On("ValidateToken", "invalid-token").Return(nil, false, errors.New("invalid token"))

		websocket.ServeWs(hub, mockAuth, w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Unauthorized")
		mockAuth.AssertExpectations(t)
	})

	t.Run("Handshake succeeds with valid token in Sec-WebSocket-Protocol", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/ws", nil)
		req.Header.Set("Sec-WebSocket-Protocol", "valid-token")
		
		// Add necessary headers for WebSocket upgrade to avoid immediate failure in some upgrader checks
		req.Header.Set("Connection", "upgrade")
		req.Header.Set("Upgrade", "websocket")
		req.Header.Set("Sec-WebSocket-Version", "13")
		req.Header.Set("Sec-WebSocket-Key", "x3JJHMbDL1EzLkh9GBhXDw==")
		
		w := httptest.NewRecorder()

		mockAuth.On("ValidateToken", "valid-token").Return(&models.User{BaseModel: models.BaseModel{ID: uuid.New()}}, true, nil)

		// ServeWs will call Upgrade. In httptest.NewRecorder, Upgrade will fail because it doesn't implement Hijacker.
		// However, we want to verify it passed the authentication check.
		websocket.ServeWs(hub, mockAuth, w, req)

		// If it passed auth, it would have called Upgrade.
		// If Upgrade fails due to Hijacker, it might return 400 or 500 depending on implementation,
		// but NOT 401 Unauthorized.
		assert.NotEqual(t, http.StatusUnauthorized, w.Code)
		mockAuth.AssertExpectations(t)
	})
}
