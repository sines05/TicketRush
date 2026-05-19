package tests

import (
	"context"
	"time"

	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
)

// mockEventRepo provides a base no-op implementation of EventRepository
type mockEventRepo struct{}

func (m *mockEventRepo) CreateEvent(event *models.Event) error { return nil }
func (m *mockEventRepo) CreateEventWithZones(ctx context.Context, event *models.Event, zones []models.EventZone, zoneSeats [][]models.Seat) error {
	return nil
}
func (m *mockEventRepo) GetEventByID(id uuid.UUID) (*models.Event, error) {
	return &models.Event{BaseModel: models.BaseModel{ID: id}}, nil
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
func (m *mockEventRepo) GetAdminStats(ctx context.Context, eventID *uuid.UUID) (map[string]interface{}, error) {
	return nil, nil
}

// manualEventRepo allows overriding specific event for tests
type manualEventRepo struct {
	mockEventRepo
	event *models.Event
}

func (m *manualEventRepo) GetEventByID(id uuid.UUID) (*models.Event, error) {
	if m.event != nil {
		return m.event, nil
	}
	return &models.Event{BaseModel: models.BaseModel{ID: id}}, nil
}

func (m *manualEventRepo) GetEventBySlug(slug string) (*models.Event, error) {
	return m.event, nil
}

// mockUserRepo provides a base no-op implementation of UserRepository
type mockUserRepo struct{}

func (m *mockUserRepo) Create(user *models.User) error                 { return nil }
func (m *mockUserRepo) FindByEmail(email string) (*models.User, error) { return nil, nil }
func (m *mockUserRepo) FindByID(id uuid.UUID) (*models.User, error) {
	return &models.User{BaseModel: models.BaseModel{ID: id}}, nil
}
func (m *mockUserRepo) Update(user *models.User) error                                { return nil }
func (m *mockUserRepo) UpdatePassword(userID uuid.UUID, newPasswordHash string) error { return nil }
func (m *mockUserRepo) CreatePasswordReset(reset *models.PasswordReset) error         { return nil }
func (m *mockUserRepo) FindPasswordResetByToken(token string) (*models.PasswordReset, error) {
	return nil, nil
}
func (m *mockUserRepo) DeletePasswordReset(token string) error { return nil }
func (m *mockUserRepo) Update2FA(userID uuid.UUID, enabled bool, secret string, recoveryCode string) error {
	return nil
}
func (m *mockUserRepo) Update2FAPending(userID uuid.UUID, pendingSecret string, recoveryCodes string) error {
	return nil
}
func (m *mockUserRepo) UpdateNotificationToken(userID uuid.UUID, token string) error { return nil }
func (m *mockUserRepo) FindAll() ([]models.User, error)                              { return nil, nil }
func (m *mockUserRepo) UpdateRole(userID uuid.UUID, role models.UserRole) error      { return nil }
func (m *mockUserRepo) UpdateMembership(userID uuid.UUID, tierID *uuid.UUID) error   { return nil }
func (m *mockUserRepo) Delete(userID uuid.UUID) error                                { return nil }

// mockNotifier provides a base no-op implementation of NotificationService
type mockNotifier struct{}

func (m *mockNotifier) NotifyTicketPurchased(user *models.User, tickets []models.Ticket, event *models.Event) {
}
func (m *mockNotifier) NotifyWelcome(user *models.User)                                {}
func (m *mockNotifier) NotifyOrderConfirmation(user *models.User, order *models.Order) {}
func (m *mockNotifier) NotifySecurityEvent(user *models.User, eventName string)        {}
func (m *mockNotifier) SendSystemNotification(userID uuid.UUID, title, message string) {}
func (m *mockNotifier) StartWorker()                                                   {}

// mockBroadcaster provides a base implementation of Broadcaster
type mockBroadcaster struct {
	broadcasts []struct {
		channel string
		data    interface{}
	}
}

func (m *mockBroadcaster) Broadcast(channel string, data interface{}) {
	m.broadcasts = append(m.broadcasts, struct {
		channel string
		data    interface{}
	}{channel, data})
}
