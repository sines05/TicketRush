package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"ticketrush/internal/models"
	"ticketrush/internal/utils"
)

const membershipPointsPerTicket = 100

type OrderRepository interface {
	LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error)
	CompleteOrder(ctx context.Context, orderID uuid.UUID) (*models.Order, error)
	CancelOrder(ctx context.Context, orderID uuid.UUID, userID uuid.UUID) ([]uuid.UUID, error)
	GetOrderByID(id uuid.UUID) (*models.Order, error)
	GetExpiredOrders(limit int) ([]models.Order, error)
	ReleaseOrder(ctx context.Context, orderID uuid.UUID) ([]uuid.UUID, error)
	GetTicketsByUserID(userID uuid.UUID) ([]models.Ticket, error)
	GetTicketsByEventID(eventID *uuid.UUID) ([]models.Ticket, error)
	GetTicketsByOrderID(orderID uuid.UUID) ([]models.Ticket, error)
	CheckInTicket(ctx context.Context, qrCodeToken string) (*models.Ticket, error)
	GetRevenueStats(ctx context.Context, eventID *uuid.UUID) (float64, int64, error)
	FindPendingOrderByUserAndEvent(ctx context.Context, userID uuid.UUID, eventID uuid.UUID) (*models.Order, error)
}

type orderRepo struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) OrderRepository {
	return &orderRepo{db: db}
}

func (r *orderRepo) LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error) {
	var order models.Order

	err := r.db.Transaction(func(tx *gorm.DB) error {
		// 0. Get user and membership tier
		var user models.User
		if err := tx.Preload("MembershipTier").First(&user, userID).Error; err != nil {
			return err
		}

		// 1. Check if seats are available and lock them for update
		var seats []models.Seat
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id IN ? AND status = ?", seatIDs, models.SeatAvailable).
			Find(&seats).Error; err != nil {
			return err
		}

		if len(seats) != len(seatIDs) {
			return utils.ErrSeatAlreadyTaken
		}

		// 2. Calculate total amount
		var totalAmount float64
		var orderItems []models.OrderItem

		for _, seatID := range seatIDs {
			// Need price from zone
			var zone models.EventZone
			if err := tx.Joins("JOIN seats ON seats.zone_id = event_zones.id").
				Where("seats.id = ?", seatID).First(&zone).Error; err != nil {
				return err
			}
			totalAmount += zone.Price
			orderItems = append(orderItems, models.OrderItem{
				SeatID: seatID,
				Price:  zone.Price,
			})
		}

		// 3. Determine expiration time based on membership tier
		lockDuration := 10 * time.Minute
		if user.MembershipTier != nil {
			// Give extra time based on priority level (e.g., 2 mins extra per level)
			lockDuration += time.Duration(user.MembershipTier.PriorityLevel*2) * time.Minute
		}

		// 4. Create Order
		order = models.Order{
			UserID:      userID,
			EventID:     eventID,
			TotalAmount: totalAmount,
			Status:      models.OrderPending,
			ExpiresAt:   time.Now().UTC().Add(lockDuration),
			OrderItems:  orderItems,
		}

		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		// 5. Update Seats status to LOCKED
		now := time.Now().UTC()
		if err := tx.Model(&models.Seat{}).
			Where("id IN ?", seatIDs).
			Updates(map[string]interface{}{
				"status":            models.SeatLocked,
				"locked_by_user_id": userID,
				"locked_at":         &now,
			}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *orderRepo) CompleteOrder(ctx context.Context, orderID uuid.UUID) (*models.Order, error) {
	var order models.Order

	err := r.db.Transaction(func(tx *gorm.DB) error {
		// 1. Get order and lock it
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("OrderItems").
			First(&order, orderID).Error; err != nil {
			return err
		}

		if order.Status != models.OrderPending {
			return utils.ErrOrderNotPending
		}

		if time.Now().UTC().After(order.ExpiresAt) {
			return utils.ErrOrderExpired
		}

		// 2. Update order status
		order.Status = models.OrderCompleted
		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// 3. Update seats status to SOLD and clear locks
		var seatIDs []uuid.UUID
		for _, item := range order.OrderItems {
			seatIDs = append(seatIDs, item.SeatID)
		}

		if err := tx.Model(&models.Seat{}).
			Where("id IN ?", seatIDs).
			Updates(map[string]interface{}{
				"status":            models.SeatSold,
				"locked_by_user_id": nil,
				"locked_at":         nil,
			}).Error; err != nil {
			return err
		}

		// 4. Create Tickets
		for _, item := range order.OrderItems {
			ticket := models.Ticket{
				OrderID:     order.ID,
				SeatID:      item.SeatID,
				UserID:      order.UserID,
				QRCodeToken: uuid.New().String(),
			}
			if err := tx.Create(&ticket).Error; err != nil {
				return err
			}
		}

		earnedPoints := len(order.OrderItems) * membershipPointsPerTicket
		if err := awardMembershipPoints(tx, order.UserID, earnedPoints); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
}

func awardMembershipPoints(tx *gorm.DB, userID uuid.UUID, points int) error {
	if err := tx.Model(&models.User{}).
		Where("id = ?", userID).
		UpdateColumn("membership_points", gorm.Expr("membership_points + ?", points)).Error; err != nil {
		return err
	}

	return tx.Exec(`
		UPDATE users
		SET membership_tier_id = (
			SELECT mt.id
			FROM membership_tiers mt
			WHERE mt.deleted_at IS NULL
				AND mt.required_points <= users.membership_points
			ORDER BY mt.required_points DESC, mt.priority_level DESC
			LIMIT 1
		)
		WHERE users.id = ?
	`, userID).Error
}

func (r *orderRepo) CancelOrder(ctx context.Context, orderID uuid.UUID, userID uuid.UUID) ([]uuid.UUID, error) {
	var seatIDs []uuid.UUID

	err := r.db.Transaction(func(tx *gorm.DB) error {
		// 1. Get order and lock it for update
		var order models.Order
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("OrderItems").
			First(&order, orderID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return utils.ErrOrderNotFound
			}
			return err
		}

		// 2. Verify ownership — only the order owner can cancel
		if order.UserID != userID {
			return utils.ErrOrderNotFound
		}

		// 3. Only PENDING orders can be cancelled
		if order.Status != models.OrderPending {
			return utils.ErrOrderNotPending
		}

		// 4. Update order status to CANCELLED
		order.Status = models.OrderCancelled
		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// 5. Collect seat IDs and release them back to AVAILABLE
		for _, item := range order.OrderItems {
			seatIDs = append(seatIDs, item.SeatID)
		}

		if len(seatIDs) == 0 {
			return nil
		}

		return tx.Model(&models.Seat{}).
			Where("id IN ?", seatIDs).
			Updates(map[string]interface{}{
				"status":            models.SeatAvailable,
				"locked_by_user_id": nil,
				"locked_at":         nil,
			}).Error
	})

	if err != nil {
		return nil, err
	}

	return seatIDs, nil
}

func (r *orderRepo) GetOrderByID(id uuid.UUID) (*models.Order, error) {
	var order models.Order
	if err := r.db.Preload("OrderItems").First(&order, id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *orderRepo) GetExpiredOrders(limit int) ([]models.Order, error) {
	var orders []models.Order
	if err := r.db.Where("status = ? AND expires_at < ?", models.OrderPending, time.Now().UTC()).
		Limit(limit).Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *orderRepo) ReleaseOrder(ctx context.Context, orderID uuid.UUID) ([]uuid.UUID, error) {
	var seatIDs []uuid.UUID
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.Preload("OrderItems").First(&order, orderID).Error; err != nil {
			return err
		}

		if order.Status != models.OrderPending {
			return nil
		}

		// Update order status
		order.Status = models.OrderCancelled
		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// Release seats
		for _, item := range order.OrderItems {
			seatIDs = append(seatIDs, item.SeatID)
		}

		if len(seatIDs) == 0 {
			return nil
		}

		return tx.Model(&models.Seat{}).
			Where("id IN ?", seatIDs).
			Updates(map[string]interface{}{
				"status":            models.SeatAvailable,
				"locked_by_user_id": nil,
				"locked_at":         nil,
			}).Error
	})
	return seatIDs, err
}

func (r *orderRepo) GetTicketsByUserID(userID uuid.UUID) ([]models.Ticket, error) {
	var tickets []models.Ticket
	if err := r.db.Preload("Seat.Zone.Event").
		Joins("JOIN orders ON orders.id = tickets.order_id").
		Where("tickets.user_id = ?", userID).
		Order("orders.created_at DESC").
		Find(&tickets).Error; err != nil {
		return nil, err
	}
	return tickets, nil
}

func (r *orderRepo) GetTicketsByEventID(eventID *uuid.UUID) ([]models.Ticket, error) {
	var tickets []models.Ticket
	query := r.db.Preload("Seat.Zone.Event").Joins("JOIN orders ON orders.id = tickets.order_id")
	if eventID != nil {
		query = query.Where("orders.event_id = ?", *eventID)
	}
	if err := query.Order("orders.created_at DESC").Find(&tickets).Error; err != nil {
		return nil, err
	}
	return tickets, nil
}

func (r *orderRepo) CheckInTicket(ctx context.Context, qrCodeToken string) (*models.Ticket, error) {
	var ticket models.Ticket
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Seat.Zone.Event").
			Where("qr_code_token = ? OR id = ?", qrCodeToken, qrCodeToken).
			First(&ticket).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return utils.ErrTicketNotFound
			}
			return err
		}

		if ticket.IsCheckedIn {
			return utils.ErrTicketAlreadyCheckedIn
		}

		ticket.IsCheckedIn = true
		if err := tx.Save(&ticket).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (r *orderRepo) GetRevenueStats(ctx context.Context, eventID *uuid.UUID) (float64, int64, error) {
	var totalRevenue float64
	var totalSold int64

	query := r.db.Model(&models.Order{}).Where("status = ?", models.OrderCompleted)
	if eventID != nil {
		query = query.Where("event_id = ?", *eventID)
	}

	if err := query.Select("COALESCE(SUM(total_amount), 0)").Scan(&totalRevenue).Error; err != nil {
		return 0, 0, err
	}

	ticketQuery := r.db.Model(&models.Ticket{})
	if eventID != nil {
		ticketQuery = ticketQuery.Joins("JOIN orders ON orders.id = tickets.order_id").Where("orders.event_id = ?", *eventID)
	}

	if err := ticketQuery.Count(&totalSold).Error; err != nil {
		return 0, 0, err
	}

	return totalRevenue, totalSold, nil
}

func (r *orderRepo) GetTicketsByOrderID(orderID uuid.UUID) ([]models.Ticket, error) {
	var tickets []models.Ticket
	if err := r.db.Preload("Seat.Zone.Event").Where("order_id = ?", orderID).Find(&tickets).Error; err != nil {
		return nil, err
	}
	return tickets, nil
}

func (r *orderRepo) FindPendingOrderByUserAndEvent(ctx context.Context, userID uuid.UUID, eventID uuid.UUID) (*models.Order, error) {
	var order models.Order
	err := r.db.Preload("OrderItems").
		Where("user_id = ? AND event_id = ? AND status = ?", userID, eventID, models.OrderPending).
		First(&order).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &order, nil
}
