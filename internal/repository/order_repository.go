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

type OrderRepository interface {
	LockSeats(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, seatIDs []uuid.UUID) (*models.Order, error)
	CompleteOrder(ctx context.Context, orderID uuid.UUID) (*models.Order, error)
	CancelOrder(ctx context.Context, orderID uuid.UUID, userID uuid.UUID) ([]uuid.UUID, error)
	GetOrderByID(id uuid.UUID) (*models.Order, error)
	GetExpiredOrders(limit int) ([]models.Order, error)
	ReleaseOrder(ctx context.Context, orderID uuid.UUID) ([]uuid.UUID, error)
	GetTicketsByUserID(userID uuid.UUID) ([]models.Ticket, error)
	GetTicketsByEventID(eventID *uuid.UUID) ([]models.Ticket, error)
	CheckInTicket(ctx context.Context, qrCodeToken string) (*models.Ticket, error)
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

		for _, seatIDs := range seatIDs {
			// Need price from zone
			var zone models.EventZone
			if err := tx.Joins("JOIN seats ON seats.zone_id = event_zones.id").
				Where("seats.id = ?", seatIDs).First(&zone).Error; err != nil {
				return err
			}
			totalAmount += zone.Price
			orderItems = append(orderItems, models.OrderItem{
				SeatID: seatIDs,
				Price:  zone.Price,
			})
		}

		// 3. Create Order
		order = models.Order{
			UserID:      userID,
			EventID:     eventID,
			TotalAmount: totalAmount,
			Status:      models.OrderPending,
			ExpiresAt:   time.Now().Add(10 * time.Minute),
			OrderItems:  orderItems,
		}

		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		// 4. Update Seats status to LOCKED
		now := time.Now()
		if err := tx.Model(&models.Seat{}).
			Where("id IN ?", seatIDs).
			Updates(map[string]interface{}{
				"status":             models.SeatLocked,
				"locked_by_user_id": userID,
				"locked_at":          &now,
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

		if time.Now().After(order.ExpiresAt) {
			return utils.ErrOrderExpired
		}

		// 2. Update order status
		order.Status = models.OrderCompleted
		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// 3. Update seats status to SOLD
		var seatIDs []uuid.UUID
		for _, item := range order.OrderItems {
			seatIDs = append(seatIDs, item.SeatID)
		}

		if err := tx.Model(&models.Seat{}).
			Where("id IN ?", seatIDs).
			Update("status", models.SeatSold).Error; err != nil {
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

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
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
				"status":             models.SeatAvailable,
				"locked_by_user_id": nil,
				"locked_at":          nil,
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
	if err := r.db.Where("status = ? AND expires_at < ?", models.OrderPending, time.Now()).
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
				"status":             models.SeatAvailable,
				"locked_by_user_id": nil,
				"locked_at":          nil,
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
