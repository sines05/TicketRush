package tests

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/service"
)

func TestSeatLockConcurrency(t *testing.T) {
	config.LoadConfig()
	dsn := "host=localhost user=user password=password dbname=ticketrush port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skip("Database not available for concurrency test")
		return
	}

	// Use unique email to avoid conflicts with leftover data
	uniqueEmail := "concurrency_" + uuid.New().String()[:8] + "@test.com"

	user := models.User{Email: uniqueEmail, PasswordHash: "hash", FullName: "Concurrency Test User"}
	require.NoError(t, db.Create(&user).Error, "failed to create test user")

	event := models.Event{Title: "Concurrency Test Event", StartTime: time.Now().Add(24 * time.Hour)}
	require.NoError(t, db.Create(&event).Error)

	zone := models.EventZone{EventID: event.ID, Name: "VIP", Price: 100, TotalRows: 1, SeatsPerRow: 1}
	require.NoError(t, db.Create(&zone).Error)

	seat := models.Seat{ZoneID: zone.ID, RowLabel: "A", SeatNumber: 1, Status: models.SeatAvailable}
	require.NoError(t, db.Create(&seat).Error)

	defer func() {
		// Cleanup in FK order
		db.Exec("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)", user.ID)
		db.Unscoped().Where("user_id = ?", user.ID).Delete(&models.Order{})
		db.Unscoped().Where("id = ?", seat.ID).Delete(&models.Seat{})
		db.Unscoped().Where("id = ?", zone.ID).Delete(&models.EventZone{})
		db.Unscoped().Where("id = ?", event.ID).Delete(&models.Event{})
		db.Unscoped().Where("id = ?", user.ID).Delete(&models.User{})
	}()

	orderRepo := repository.NewOrderRepository(db)
	mockQueue := &mockQueueRepo{isAllowedResult: true}
	orderSvc := service.NewOrderService(orderRepo, mockQueue, &mockBroadcaster{})

	var wg sync.WaitGroup
	successCount := 0
	failCount := 0
	var mu sync.Mutex

	numRequests := 10
	for i := 0; i < numRequests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := orderSvc.LockSeats(context.Background(), user.ID, event.ID, []uuid.UUID{seat.ID})
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
}
