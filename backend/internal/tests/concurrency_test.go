package tests

import (
	"context"
	"fmt"
	"sync"
	"testing"

	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/service"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestSeatLockConcurrency(t *testing.T) {
	config.LoadConfig() // Ensure env is loaded
	// Use a test-specific DSN if needed, but for simplicity we'll try to connect to the local DB
	dsn := "host=localhost user=user password=password dbname=ticketrush port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skip("Database not available for concurrency test")
		return
	}

	// Ensure schema has the latest user columns used by the model.
	// This test connects to a local DB directly and may run without migrations.
	_ = db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);`).Error
	_ = db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255);`).Error
	_ = db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE;`).Error
	_ = db.Exec(`ALTER TABLE event_zones ADD COLUMN IF NOT EXISTS layout_meta JSONB NOT NULL DEFAULT '{}'::jsonb;`).Error

	// Setup: Create a test event and one seat
	event := models.Event{Title: "Concurrency Test"}
	db.Create(&event)
	zone := models.EventZone{EventID: event.ID, Name: "VIP", Price: 100}
	db.Create(&zone)
	seat := models.Seat{ZoneID: zone.ID, RowLabel: "A", SeatNumber: 1, Status: models.SeatAvailable}
	db.Create(&seat)

	orderRepo := repository.NewOrderRepository(db)
	orderSvc := service.NewOrderService(orderRepo)

	// Create test users up-front (orders.user_id has FK constraint)
	userIDs := make([]uuid.UUID, 0, 10)
	numRequests := 10
	for i := 0; i < numRequests; i++ {
		u := models.User{
			Email:        fmt.Sprintf("concurrency-%d-%s@example.com", i, uuid.NewString()),
			PasswordHash: "test-hash",
			FullName:     "Concurrency Test",
			Role:         models.RoleCustomer,
		}
		if err := db.Create(&u).Error; err != nil {
			t.Fatalf("failed to create test user: %v", err)
		}
		userIDs = append(userIDs, u.ID)
	}

	var wg sync.WaitGroup
	successCount := 0
	failCount := 0
	var mu sync.Mutex

	for i := 0; i < numRequests; i++ {
		wg.Add(1)
		go func(userID uuid.UUID) {
			defer wg.Done()
			_, err := orderSvc.LockSeats(context.Background(), userID, event.ID, []uuid.UUID{seat.ID})
			mu.Lock()
			if err == nil {
				successCount++
			} else {
				failCount++
			}
			mu.Unlock()
		}(userIDs[i])
	}

	wg.Wait()

	assert.Equal(t, 1, successCount, "Exactly one user should successfully lock the seat")
	assert.Equal(t, numRequests-1, failCount, "All other users should fail to lock the seat")

	// Cleanup
	db.Unscoped().Delete(&seat)
	db.Unscoped().Delete(&zone)
	db.Unscoped().Delete(&event)
	for _, id := range userIDs {
		db.Unscoped().Delete(&models.User{}, id)
	}
}
