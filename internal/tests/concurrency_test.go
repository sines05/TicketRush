package tests

import (
	"context"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/service"
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

	// Setup: Create a test event and one seat
	event := models.Event{Title: "Concurrency Test"}
	db.Create(&event)
	zone := models.EventZone{EventID: event.ID, Name: "VIP", Price: 100}
	db.Create(&zone)
	seat := models.Seat{ZoneID: zone.ID, RowLabel: "A", SeatNumber: 1, Status: models.SeatAvailable}
	db.Create(&seat)

	orderRepo := repository.NewOrderRepository(db)
	orderSvc := service.NewOrderService(orderRepo)

	var wg sync.WaitGroup
	successCount := 0
	failCount := 0
	var mu sync.Mutex

	numRequests := 10
	for i := 0; i < numRequests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			userID := uuid.New()
			_, err := orderSvc.LockSeats(context.Background(), userID, event.ID, []uuid.UUID{seat.ID})
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
	db.Unscoped().Delete(&seat)
	db.Unscoped().Delete(&zone)
	db.Unscoped().Delete(&event)
}
