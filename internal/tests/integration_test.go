package tests

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
)

// setupIntegration initializes a real DB + Redis connection for integration tests.
// Returns cleanup function.
func setupIntegration(t *testing.T) (*gorm.DB, *redis.Client, func()) {
	t.Helper()
	config.LoadConfig()

	dsn := "host=localhost user=user password=password dbname=ticketrush port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skip("PostgreSQL not available, skipping integration test")
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		t.Skip("Redis not available, skipping integration test")
	}

	cleanup := func() {
		rdb.FlushDB(context.Background())
		rdb.Close()
	}
	return db, rdb, cleanup
}

// ============================================================
// Integration Test: Full Booking Flow
// Queue → Lock Seats → Checkout → Verify Tickets
// ============================================================

func TestIntegration_FullBookingFlow(t *testing.T) {
	db, rdb, cleanup := setupIntegration(t)
	defer cleanup()

	ctx := context.Background()

	// --- Setup test data ---
	user := models.User{
		Email:        "integration_" + uuid.New().String()[:8] + "@test.com",
		PasswordHash: "hash",
		FullName:     "Integration Test User",
		Gender:       models.GenderMale,
		DateOfBirth:  time.Date(1995, 1, 1, 0, 0, 0, 0, time.UTC),
	}
	require.NoError(t, db.Create(&user).Error)

	event := models.Event{
		Title:       "Integration Test Event",
		IsPublished: true,
		StartTime:   time.Now().Add(24 * time.Hour),
	}
	require.NoError(t, db.Create(&event).Error)

	zone := models.EventZone{
		EventID:     event.ID,
		Name:        "VIP",
		Price:       200,
		TotalRows:   1,
		SeatsPerRow: 2,
	}
	require.NoError(t, db.Create(&zone).Error)

	seats := []models.Seat{
		{ZoneID: zone.ID, RowLabel: "A", SeatNumber: 1, Status: models.SeatAvailable},
		{ZoneID: zone.ID, RowLabel: "A", SeatNumber: 2, Status: models.SeatAvailable},
	}
	require.NoError(t, db.Create(&seats).Error)

	defer func() {
		// Cleanup in correct FK order: children first
		db.Unscoped().Where("user_id = ?", user.ID).Delete(&models.Ticket{})
		db.Exec("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)", user.ID)
		db.Unscoped().Where("user_id = ?", user.ID).Delete(&models.Order{})
		db.Unscoped().Where("zone_id = ?", zone.ID).Delete(&models.Seat{})
		db.Unscoped().Where("event_id = ?", event.ID).Delete(&models.EventZone{})
		db.Unscoped().Delete(&event)
		db.Unscoped().Delete(&user)
	}()

	// --- Initialize services ---
	queueRepo := repository.NewQueueRepository(rdb)
	orderRepo := repository.NewOrderRepository(db)
	broadcaster := &mockBroadcaster{}
	queueService := service.NewQueueService(queueRepo)
	orderService := service.NewOrderService(orderRepo, queueRepo, broadcaster)

	// --- Step 1: User NOT in queue → Lock should FAIL ---
	t.Run("LockSeats_FailsWithoutQueueAccess", func(t *testing.T) {
		_, err := orderService.LockSeats(ctx, user.ID, event.ID, []uuid.UUID{seats[0].ID})
		assert.ErrorIs(t, err, utils.ErrQueueNotAllowed)
	})

	// --- Step 2: User joins queue ---
	t.Run("JoinQueue", func(t *testing.T) {
		status, err := queueService.JoinQueue(ctx, event.ID, user.ID)
		require.NoError(t, err)
		assert.Equal(t, "waiting", status)
	})

	// --- Step 3: Process queue to admit user ---
	t.Run("ProcessQueue", func(t *testing.T) {
		err := queueService.ProcessQueue(ctx, event.ID)
		require.NoError(t, err)

		status, _, err := queueService.GetStatus(ctx, event.ID, user.ID)
		require.NoError(t, err)
		assert.Equal(t, "allowed", status)
	})

	// --- Step 4: User IS in queue → Lock should SUCCEED ---
	var orderID uuid.UUID
	t.Run("LockSeats_SucceedsAfterQueueAccess", func(t *testing.T) {
		order, err := orderService.LockSeats(ctx, user.ID, event.ID, []uuid.UUID{seats[0].ID})
		require.NoError(t, err)
		assert.Equal(t, models.OrderPending, order.Status)
		orderID = order.ID

		// Verify seat is LOCKED in DB
		var seat models.Seat
		db.First(&seat, seats[0].ID)
		assert.Equal(t, models.SeatLocked, seat.Status)
		assert.Equal(t, &user.ID, seat.LockedByUserID)
	})

	// --- Step 5: Checkout ---
	t.Run("Checkout_SucceedsAndRemovesFromActive", func(t *testing.T) {
		order, err := orderService.Checkout(ctx, user.ID, orderID)
		require.NoError(t, err)
		assert.Equal(t, models.OrderCompleted, order.Status)

		// Verify seat is SOLD
		var seat models.Seat
		db.First(&seat, seats[0].ID)
		assert.Equal(t, models.SeatSold, seat.Status)

		// Verify ticket created
		var ticketCount int64
		db.Model(&models.Ticket{}).Where("user_id = ?", user.ID).Count(&ticketCount)
		assert.Equal(t, int64(1), ticketCount)

		// Verify user removed from Redis active set
		allowed, err := queueRepo.IsAllowed(ctx, event.ID, user.ID)
		require.NoError(t, err)
		assert.False(t, allowed, "user should be removed from active set after checkout")
	})
}

// ============================================================
// Integration Test: Expired Order Releases Seats and Redis
// ============================================================

func TestIntegration_ExpiredOrderRelease(t *testing.T) {
	db, rdb, cleanup := setupIntegration(t)
	defer cleanup()

	ctx := context.Background()

	// --- Setup ---
	user := models.User{
		Email:        "expire_" + uuid.New().String()[:8] + "@test.com",
		PasswordHash: "hash",
		FullName:     "Expire Test User",
	}
	require.NoError(t, db.Create(&user).Error)

	event := models.Event{Title: "Expire Test Event", IsPublished: true, StartTime: time.Now().Add(24 * time.Hour)}
	require.NoError(t, db.Create(&event).Error)

	zone := models.EventZone{EventID: event.ID, Name: "Standard", Price: 50, TotalRows: 1, SeatsPerRow: 1}
	require.NoError(t, db.Create(&zone).Error)

	seat := models.Seat{ZoneID: zone.ID, RowLabel: "A", SeatNumber: 1, Status: models.SeatAvailable}
	require.NoError(t, db.Create(&seat).Error)

	defer func() {
		// Cleanup in correct FK order: children first
		db.Exec("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)", user.ID)
		db.Unscoped().Where("user_id = ?", user.ID).Delete(&models.Order{})
		db.Unscoped().Where("zone_id = ?", zone.ID).Delete(&models.Seat{})
		db.Unscoped().Where("event_id = ?", event.ID).Delete(&models.EventZone{})
		db.Unscoped().Delete(&event)
		db.Unscoped().Delete(&user)
	}()

	queueRepo := repository.NewQueueRepository(rdb)
	orderRepo := repository.NewOrderRepository(db)
	broadcaster := &mockBroadcaster{}
	queueService := service.NewQueueService(queueRepo)
	orderService := service.NewOrderService(orderRepo, queueRepo, broadcaster)

	// Allow user and lock seat
	_ = queueRepo.AllowUser(ctx, event.ID, user.ID)
	order, err := orderService.LockSeats(ctx, user.ID, event.ID, []uuid.UUID{seat.ID})
	require.NoError(t, err)

	// Force expire the order
	db.Model(&models.Order{}).Where("id = ?", order.ID).Update("expires_at", time.Now().Add(-1*time.Minute))

	// Simulate worker: get expired orders and release them
	expired, err := orderRepo.GetExpiredOrders(10)
	require.NoError(t, err)
	assert.Len(t, expired, 1)

	seatIDs, err := orderRepo.ReleaseOrder(ctx, expired[0].ID)
	require.NoError(t, err)
	assert.Len(t, seatIDs, 1)

	// Remove user from active set (what the worker does)
	require.NoError(t, queueRepo.RemoveFromActive(ctx, event.ID, user.ID))

	// Verify seat is back to AVAILABLE
	var updatedSeat models.Seat
	db.First(&updatedSeat, seat.ID)
	assert.Equal(t, models.SeatAvailable, updatedSeat.Status)
	assert.Nil(t, updatedSeat.LockedByUserID)

	// Verify user is no longer in active set
	allowed, err := queueRepo.IsAllowed(ctx, event.ID, user.ID)
	require.NoError(t, err)
	assert.False(t, allowed)

	// Verify new user can now join and be admitted
	newUser := uuid.New()
	err = queueRepo.AllowUser(ctx, event.ID, newUser)
	require.NoError(t, err)
	allowed, _ = queueRepo.IsAllowed(ctx, event.ID, newUser)
	assert.True(t, allowed)

	// Process queue should work normally
	err = queueService.ProcessQueue(ctx, event.ID)
	require.NoError(t, err)
}
