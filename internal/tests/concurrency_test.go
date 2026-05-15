package tests

import (
	"context"
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
	dsn := "host=localhost user=user password=password dbname=ticketrush port=5433 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skip("Database not available for concurrency test")
		return
	}
	if !db.Migrator().HasColumn(&models.Event{}, "organizer_meta") ||
		!db.Migrator().HasColumn(&models.Event{}, "event_meta") ||
		!db.Migrator().HasColumn(&models.EventZone{}, "layout_meta") {
		t.Skip("Database schema is not migrated for concurrency test")
	}

	// Setup: Create a test user, event and one seat
	user := models.User{Email: uuid.New().String() + "@ticketrush.com", PasswordHash: "hash", FullName: "Test User"}
	if err := db.Create(&user).Error; err != nil {
		t.Skipf("Database not writable for concurrency test: %v", err)
	}
	t.Cleanup(func() { db.Unscoped().Delete(&user) })

	event := models.Event{Title: "Concurrency Test", Slug: uuid.New().String()}
	if err := db.Create(&event).Error; err != nil {
		t.Skipf("Database event setup failed: %v", err)
	}
	t.Cleanup(func() { db.Unscoped().Delete(&event) })

	zone := models.EventZone{EventID: event.ID, Name: "VIP", Price: 100}
	if err := db.Create(&zone).Error; err != nil {
		t.Skipf("Database zone setup failed: %v", err)
	}
	t.Cleanup(func() { db.Unscoped().Delete(&zone) })

	seat := models.Seat{ZoneID: zone.ID, RowLabel: "A", SeatNumber: 1, Status: models.SeatAvailable}
	if err := db.Create(&seat).Error; err != nil {
		t.Skipf("Database seat setup failed: %v", err)
	}
	t.Cleanup(func() { db.Unscoped().Delete(&seat) })

	orderRepo := repository.NewOrderRepository(db)
	orderSvc := service.NewOrderService(orderRepo, &mockEventRepo{}, &mockQueueRepo{}, &mockBroadcaster{}, &mockNotifier{}, &mockUserRepo{})

	var wg sync.WaitGroup
	successCount := 0
	failCount := 0
	var mu sync.Mutex

	numRequests := 10
	for i := 0; i < numRequests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			// Create a new user for each request to test true concurrency between different users
			newUser := models.User{Email: uuid.New().String() + "@ticketrush.com", PasswordHash: "hash", FullName: "Test User"}
			db.Create(&newUser)
			defer db.Unscoped().Delete(&newUser)

			_, err := orderSvc.LockSeats(context.Background(), newUser.ID, event.ID, []uuid.UUID{seat.ID}, "")
			mu.Lock()
			if err == nil {
				successCount++
			} else {
				failCount++
			}
			mu.Unlock()
		}()
	}

	wg.Wait()

	assert.Equal(t, 1, successCount, "Exactly one user should successfully lock the seat")
	assert.Equal(t, numRequests-1, failCount, "All other users should fail to lock the seat")

	// Cleanup
	db.Exec("DELETE FROM order_items")
	db.Exec("DELETE FROM orders")
	db.Unscoped().Delete(&seat)
	db.Unscoped().Delete(&zone)
	db.Unscoped().Delete(&event)
	db.Unscoped().Delete(&user)
}
