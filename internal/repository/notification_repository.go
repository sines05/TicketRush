package repository

import (
	"ticketrush/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationRepository interface {
	Create(notification *models.Notification) error
	CreateBulk(notifications []models.Notification) error
	FindByUserID(userID uuid.UUID, limit, offset int) ([]models.Notification, error)
	CountUnreadByUserID(userID uuid.UUID) (int64, error)
	MarkAsRead(id uuid.UUID, userID uuid.UUID) error
	MarkAllAsRead(userID uuid.UUID) error
	Delete(id uuid.UUID, userID uuid.UUID) error
	FindAll(limit, offset int) ([]models.Notification, error)
	CountAll() (int64, error)
	FindUsersWithTicketsForEvent(eventID uuid.UUID) ([]uuid.UUID, error)
	FindPendingOrdersExpiringSoon(minutesBefore int) ([]models.Order, error)
	FindAllUserIDs() ([]uuid.UUID, error)
}

type notificationRepo struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) NotificationRepository {
	return &notificationRepo{db: db}
}

func (r *notificationRepo) Create(notification *models.Notification) error {
	return r.db.Create(notification).Error
}

func (r *notificationRepo) CreateBulk(notifications []models.Notification) error {
	if len(notifications) == 0 {
		return nil
	}
	return r.db.Create(&notifications).Error
}

// FindByUserID returns notifications targeted at the user OR broadcast notifications (user_id IS NULL).
// Results are ordered by creation time (newest first).
func (r *notificationRepo) FindByUserID(userID uuid.UUID, limit, offset int) ([]models.Notification, error) {
	var notifications []models.Notification
	if err := r.db.Where("user_id = ? OR user_id IS NULL", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error; err != nil {
		return nil, err
	}
	return notifications, nil
}

func (r *notificationRepo) CountUnreadByUserID(userID uuid.UUID) (int64, error) {
	var count int64
	// For broadcast notifications (user_id IS NULL), we treat them as unread for everyone
	// unless a per-user read-tracking table exists. For simplicity, broadcast notifications
	// are always counted in the unread total.
	if err := r.db.Model(&models.Notification{}).
		Where("(user_id = ? OR user_id IS NULL) AND is_read = false", userID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *notificationRepo) MarkAsRead(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Model(&models.Notification{}).
		Where("id = ? AND (user_id = ? OR user_id IS NULL)", id, userID).
		Update("is_read", true).Error
}

func (r *notificationRepo) MarkAllAsRead(userID uuid.UUID) error {
	return r.db.Model(&models.Notification{}).
		Where("(user_id = ? OR user_id IS NULL) AND is_read = false", userID).
		Update("is_read", true).Error
}

func (r *notificationRepo) Delete(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Notification{}).Error
}

func (r *notificationRepo) FindAll(limit, offset int) ([]models.Notification, error) {
	var notifications []models.Notification
	if err := r.db.Raw(`
		SELECT * FROM (
			SELECT DISTINCT ON (title, message, type) * 
			FROM notifications
		) t
		ORDER BY t.created_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset).Scan(&notifications).Error; err != nil {
		return nil, err
	}
	return notifications, nil
}

func (r *notificationRepo) CountAll() (int64, error) {
	var count int64
	if err := r.db.Raw("SELECT COUNT(*) FROM (SELECT DISTINCT title, message, type FROM notifications) t").Scan(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// FindUsersWithTicketsForEvent returns user IDs that have tickets for the given event
func (r *notificationRepo) FindUsersWithTicketsForEvent(eventID uuid.UUID) ([]uuid.UUID, error) {
	var userIDs []uuid.UUID
	if err := r.db.Model(&models.Ticket{}).
		Select("DISTINCT tickets.user_id").
		Joins("JOIN orders ON orders.id = tickets.order_id").
		Where("orders.event_id = ?", eventID).
		Pluck("tickets.user_id", &userIDs).Error; err != nil {
		return nil, err
	}
	return userIDs, nil
}

// FindPendingOrdersExpiringSoon finds pending orders that expire within the given minutes
func (r *notificationRepo) FindPendingOrdersExpiringSoon(minutesBefore int) ([]models.Order, error) {
	var orders []models.Order
	if err := r.db.Preload("Event").
		Where("status = ? AND expires_at > NOW() AND expires_at <= NOW() + INTERVAL '1 minute' * ?",
			models.OrderPending, minutesBefore).
		Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

// FindAllUserIDs retrieves all user IDs from the users database table
func (r *notificationRepo) FindAllUserIDs() ([]uuid.UUID, error) {
	var userIDs []uuid.UUID
	if err := r.db.Model(&models.User{}).Pluck("id", &userIDs).Error; err != nil {
		return nil, err
	}
	return userIDs, nil
}
