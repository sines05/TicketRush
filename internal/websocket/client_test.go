package websocket

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"ticketrush/internal/models"
	"ticketrush/internal/service"

	"github.com/gorilla/websocket"
	"github.com/google/uuid"
)

type mockAuthService struct {
	service.AuthService
	validateTokenFunc func(tokenString string) (*models.User, error)
}

func (m *mockAuthService) ValidateToken(tokenString string) (*models.User, error) {
	if m.validateTokenFunc != nil {
		return m.validateTokenFunc(tokenString)
	}
	return nil, errors.New("not implemented")
}

func TestServeWs_Auth(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	tests := []struct {
		name           string
		cookie         *http.Cookie
		protocolHeader string
		validateFunc   func(tokenString string) (*models.User, error)
		expectedStatus int
	}{
		{
			name: "Valid Cookie Auth",
			cookie: &http.Cookie{
				Name:  "tr_access_token",
				Value: "valid-token",
			},
			validateFunc: func(tokenString string) (*models.User, error) {
				if tokenString == "valid-token" {
					return &models.User{BaseModel: models.BaseModel{ID: uuid.New()}}, nil
				}
				return nil, errors.New("invalid token")
			},
			expectedStatus: -1, // Upgrade expected
		},
		{
			name:           "Valid Protocol Header Auth",
			protocolHeader: "valid-token-header",
			validateFunc: func(tokenString string) (*models.User, error) {
				if tokenString == "valid-token-header" {
					return &models.User{BaseModel: models.BaseModel{ID: uuid.New()}}, nil
				}
				return nil, errors.New("invalid token")
			},
			expectedStatus: -1, // Upgrade expected
		},
		{
			name:           "Unauthorized - No Token",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "Invalid Token",
			cookie: &http.Cookie{
				Name:  "tr_access_token",
				Value: "invalid-token",
			},
			validateFunc: func(tokenString string) (*models.User, error) {
				return nil, errors.New("invalid token")
			},
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				auth := &mockAuthService{validateTokenFunc: tt.validateFunc}
				ServeWs(hub, auth, w, r)
			}))
			defer server.Close()

			url := "ws" + strings.TrimPrefix(server.URL, "http")
			dialer := websocket.Dialer{}
			header := http.Header{}
			if tt.cookie != nil {
				header.Add("Cookie", tt.cookie.String())
			}
			if tt.protocolHeader != "" {
				header.Add("Sec-WebSocket-Protocol", tt.protocolHeader)
			}

			conn, resp, err := dialer.Dial(url, header)
			if tt.expectedStatus == -1 {
				if err != nil {
					t.Fatalf("Failed to upgrade: %v", err)
				}
				defer conn.Close()
			} else {
				if resp.StatusCode != tt.expectedStatus {
					t.Errorf("Expected status %d, got %d", tt.expectedStatus, resp.StatusCode)
				}
			}
		})
	}
}

func TestHub_Broadcast(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	auth := &mockAuthService{
		validateTokenFunc: func(tokenString string) (*models.User, error) {
			return &models.User{BaseModel: models.BaseModel{ID: uuid.New()}}, nil
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ServeWs(hub, auth, w, r)
	}))
	defer server.Close()

	url := "ws" + strings.TrimPrefix(server.URL, "http")
	
	// Client 1 subscribes to event:1
	conn1, _, err := websocket.DefaultDialer.Dial(url, http.Header{"Sec-WebSocket-Protocol": []string{"token1"}})
	if err != nil {
		t.Fatalf("Client 1 failed to connect: %v", err)
	}
	defer conn1.Close()

	subMsg := clientMessage{Action: "subscribe", Channel: "event:1"}
	if err := conn1.WriteJSON(subMsg); err != nil {
		t.Fatalf("Client 1 failed to subscribe: %v", err)
	}

	// Client 2 subscribes to event:2
	conn2, _, err := websocket.DefaultDialer.Dial(url, http.Header{"Sec-WebSocket-Protocol": []string{"token2"}})
	if err != nil {
		t.Fatalf("Client 2 failed to connect: %v", err)
	}
	defer conn2.Close()

	subMsg2 := clientMessage{Action: "subscribe", Channel: "event:2"}
	if err := conn2.WriteJSON(subMsg2); err != nil {
		t.Fatalf("Client 2 failed to subscribe: %v", err)
	}

	// Wait a bit for subscriptions to be processed
	// In a real test we might want a more robust way to wait
	// but for this simple test a small sleep or just proceeding might work
	// since Hub.Run is in a goroutine.

	broadcastData := map[string]interface{}{"seat": "A1", "status": "booked"}
	hub.Broadcast("event:1", broadcastData)

	// Client 1 should receive the message
	_, msg1, err := conn1.ReadMessage()
	if err != nil {
		t.Fatalf("Client 1 failed to read message: %v", err)
	}
	if !strings.Contains(string(msg1), "booked") {
		t.Errorf("Client 1 received unexpected message: %s", string(msg1))
	}

	// Client 2 should NOT receive the message
	// We'll use a short deadline to check
	conn2.SetReadDeadline(time.Now().Add(100 * time.Millisecond))
	_, _, err = conn2.ReadMessage()
	if err == nil {
		t.Errorf("Client 2 received message it shouldn't have")
	}
}
