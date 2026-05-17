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

func getTestDB(t *testing.T) *gorm.DB {
	config.LoadConfig() // Ensure env is loaded
	// Use a test-specific DSN if needed, but for simplicity we'll try to connect to the local DB
	dsn := "host=localhost user=user password=password dbname=ticketrush port=5433 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skip("Database not available for concurrency test")
		return nil
	}
	if !db.Migrator().HasColumn(&models.Event{}, "organizer_meta") ||
		!db.Migrator().HasColumn(&models.Event{}, "event_meta") ||
		!db.Migrator().HasColumn(&models.EventZone{}, "layout_meta") {
		t.Skip("Database schema is not migrated for concurrency test")
		return nil
	}
	return db
}

func TestSeatLockConcurrency(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
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

func TestDeadlockPrevention(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	orderRepo := repository.NewOrderRepository(db)

	// Setup: Create event, zone, and seats
	event := models.Event{Title: "Deadlock Test", Slug: uuid.New().String()}
	db.Create(&event)
	t.Cleanup(func() { db.Unscoped().Delete(&event) })

	zone := models.EventZone{EventID: event.ID, Name: "VIP", Price: 100}
	db.Create(&zone)
	t.Cleanup(func() { db.Unscoped().Delete(&zone) })

	seat1 := models.Seat{ZoneID: zone.ID, RowLabel: "A", SeatNumber: 1, Status: models.SeatAvailable}
	seat2 := models.Seat{ZoneID: zone.ID, RowLabel: "A", SeatNumber: 2, Status: models.SeatAvailable}
	db.Create(&seat1)
	db.Create(&seat2)
	t.Cleanup(func() {
		db.Unscoped().Delete(&seat1)
		db.Unscoped().Delete(&seat2)
	})

	user1 := models.User{Email: uuid.New().String() + "@test.com", FullName: "User 1"}
	user2 := models.User{Email: uuid.New().String() + "@test.com", FullName: "User 2"}
	db.Create(&user1)
	db.Create(&user2)
	t.Cleanup(func() {
		db.Unscoped().Delete(&user1)
		db.Unscoped().Delete(&user2)
	})

	var wg sync.WaitGroup
	wg.Add(2)

	errs := make(chan error, 2)

	go func() {
		defer wg.Done()
		_, err := orderRepo.LockSeats(context.Background(), user1.ID, event.ID, []uuid.UUID{seat1.ID, seat2.ID})
		if err != nil {
			errs <- err
		}
	}()

	go func() {
		defer wg.Done()
		// Pass them in reverse order
		_, err := orderRepo.LockSeats(context.Background(), user2.ID, event.ID, []uuid.UUID{seat2.ID, seat1.ID})
		if err != nil {
			errs <- err
		}
	}()

	wg.Wait()
	close(errs)

	successCount := 0
	failCount := 0
	for err := range errs {
		if err != nil {
			failCount++
		}
	}
	successCount = 2 - failCount

	assert.Equal(t, 1, successCount, "Exactly one user should successfully lock the seats")
	assert.Equal(t, 1, failCount, "The other user should fail")

	// Cleanup
	db.Exec("DELETE FROM order_items")
	db.Exec("DELETE FROM orders")
}

func TestRaceCompleteRelease(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	orderRepo := repository.NewOrderRepository(db)

	// Setup
	event := models.Event{Title: "Race Test", Slug: uuid.New().String()}
	db.Create(&event)
	zone := models.EventZone{EventID: event.ID, Name: "VIP", Price: 100}
	db.Create(&zone)
	seat := models.Seat{ZoneID: zone.ID, RowLabel: "A", SeatNumber: 1, Status: models.SeatAvailable}
	db.Create(&seat)
	user := models.User{Email: uuid.New().String() + "@test.com", FullName: "User"}
	db.Create(&user)

	t.Cleanup(func() {
		db.Unscoped().Delete(&user)
		db.Unscoped().Delete(&seat)
		db.Unscoped().Delete(&zone)
		db.Unscoped().Delete(&event)
	})

	// Lock seat to create a pending order
	order, err := orderRepo.LockSeats(context.Background(), user.ID, event.ID, []uuid.UUID{seat.ID})
	assert.NoError(t, err)

	// Now try to Complete and Release simultaneously
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		orderRepo.CompleteOrder(context.Background(), order.ID)
	}()

	go func() {
		defer wg.Done()
		orderRepo.ReleaseOrder(context.Background(), order.ID)
	}()

	wg.Wait()

	finalOrder, _ := orderRepo.GetOrderByID(order.ID)
	assert.True(t, finalOrder.Status == models.OrderCompleted || finalOrder.Status == models.OrderCancelled)

	var finalSeat models.Seat
	db.First(&finalSeat, seat.ID)
	if finalOrder.Status == models.OrderCompleted {
		assert.Equal(t, models.SeatSold, finalSeat.Status)
	} else {
		assert.Equal(t, models.SeatAvailable, finalSeat.Status)
	}

	// Cleanup
	db.Exec("DELETE FROM tickets")
	db.Exec("DELETE FROM order_items")
	db.Exec("DELETE FROM orders")
}

func TestNPlusOneAndTotalAmount(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	orderRepo := repository.NewOrderRepository(db)

	// Setup
	event := models.Event{Title: "N+1 Test", Slug: uuid.New().String()}
	db.Create(&event)
	zone1 := models.EventZone{EventID: event.ID, Name: "VIP", Price: 150}
	db.Create(&zone1)
	zone2 := models.EventZone{EventID: event.ID, Name: "Regular", Price: 50}
	db.Create(&zone2)

	seat1 := models.Seat{ZoneID: zone1.ID, RowLabel: "A", SeatNumber: 1, Status: models.SeatAvailable}
	seat2 := models.Seat{ZoneID: zone2.ID, RowLabel: "B", SeatNumber: 1, Status: models.SeatAvailable}
	db.Create(&seat1)
	db.Create(&seat2)

	user := models.User{Email: uuid.New().String() + "@test.com", FullName: "User"}
	db.Create(&user)

	t.Cleanup(func() {
		db.Unscoped().Delete(&user)
		db.Unscoped().Delete(&seat1)
		db.Unscoped().Delete(&seat2)
		db.Unscoped().Delete(&zone1)
		db.Unscoped().Delete(&zone2)
		db.Unscoped().Delete(&event)
	})

	// Lock both seats
	order, err := orderRepo.LockSeats(context.Background(), user.ID, event.ID, []uuid.UUID{seat1.ID, seat2.ID})
	assert.NoError(t, err)
	assert.NotNil(t, order)

	// Verify total amount: 150 + 50 = 200
	assert.Equal(t, float64(200), order.TotalAmount)
	assert.Equal(t, 2, len(order.OrderItems))

	// Cleanup
	db.Exec("DELETE FROM order_items")
	db.Exec("DELETE FROM orders")
}
