package worker

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"ticketrush/internal/models"
	"ticketrush/internal/queue"
	"ticketrush/internal/repository"
	"ticketrush/internal/service"
	"ticketrush/internal/websocket"
)

type WorkerService interface {
	StartWorkers()
	ReleaseExpiredSessions()
}

type workerService struct {
	db           *gorm.DB
	queueService queue.Service
	queueRepo    queue.Repository
	wsHub        *websocket.Hub
	orderRepo    repository.OrderRepository
	notifSvc     service.NotificationService
	notifRepo    repository.NotificationRepository
	rdb          *redis.Client
}

func NewWorkerService(db *gorm.DB, queueService queue.Service, queueRepo queue.Repository, wsHub *websocket.Hub, orderRepo repository.OrderRepository, notifSvc service.NotificationService, notifRepo repository.NotificationRepository, rdb *redis.Client) WorkerService {
	return &workerService{
		db:           db,
		queueService: queueService,
		queueRepo:    queueRepo,
		wsHub:        wsHub,
		orderRepo:    orderRepo,
		notifSvc:     notifSvc,
		notifRepo:    notifRepo,
		rdb:          rdb,
	}
}

func (s *workerService) StartWorkers() {
	// Order Expiration Worker
	tickerOrders := time.NewTicker(1 * time.Minute)
	go func() {
		for range tickerOrders.C {
			s.releaseExpiredOrders()
		}
	}()

	// Queue Processor Worker
	tickerQueue := time.NewTicker(2 * time.Second)
	go func() {
		for range tickerQueue.C {
			var events []models.Event
			if err := s.db.Where("is_published = ?", true).Find(&events).Error; err != nil {
				log.Printf("Error fetching events for queue processing: %v", err)
				continue
			}

			for _, event := range events {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				
				// 1. Lấy chỉ số cũ trước khi xử lý
				oldIndex, _ := s.queueRepo.GetProcessedIndex(ctx, event.ID)
				
				admitted, err := s.queueService.ProcessQueue(ctx, event.ID)
				if err != nil {
					log.Printf("Error processing queue for event %s: %v", event.ID, err)
				} else {
					for _, session := range admitted {
						channelName := fmt.Sprintf("user:%s", session.UserID)
						s.wsHub.Broadcast(channelName, map[string]interface{}{
							"type":        "QUEUE_PASSED",
							"event_id":    session.EventID,
							"queue_token": session.Token,
							"allowed_at":  session.AllowedAt,
						})
					}

					// 2. Lấy chỉ số mới. Nếu có sự thay đổi (có người được bốc vào), phát thông báo cho toàn bộ channel sự kiện
					newIndex, _ := s.queueRepo.GetProcessedIndex(ctx, event.ID)
					if newIndex > oldIndex {
						channelName := fmt.Sprintf("event:%s", event.ID)
						s.wsHub.Broadcast(channelName, map[string]interface{}{
							"type":          "QUEUE_UPDATE",
							"event_id":      event.ID,
							"current_index": newIndex,
						})
					}
				}
				cancel()
			}
		}
	}()

	// Session Timeout Worker
	tickerSessions := time.NewTicker(1 * time.Minute)
	go func() {
		for range tickerSessions.C {
			s.ReleaseExpiredSessions()
		}
	}()

	// Event Reminder Worker — every 30 minutes, check for events starting within 24 hours
	tickerEventReminder := time.NewTicker(30 * time.Minute)
	go func() {
		for range tickerEventReminder.C {
			s.sendEventReminders()
		}
	}()

	// Payment Reminder Worker — every 2 minutes, check for orders expiring within 5 minutes
	tickerPaymentReminder := time.NewTicker(2 * time.Minute)
	go func() {
		for range tickerPaymentReminder.C {
			s.sendPaymentReminders()
		}
	}()
}

func (s *workerService) ReleaseExpiredSessions() {
	ctx := context.Background()
	expiredTokens, err := s.queueRepo.GetExpiredSessions(ctx, 100)
	if err != nil {
		log.Printf("Error getting expired sessions: %v", err)
		return
	}

	for _, token := range expiredTokens {
		session, err := s.queueRepo.GetSession(ctx, token)
		if err != nil {
			continue
		}

		if session.Status == "allowed" && session.AllowedAt != nil {
			shouldExpire := false
			if session.OrderID == nil {
				shouldExpire = true
			} else {
				// Check if the order is still pending
				order, err := s.orderRepo.GetOrderByID(*session.OrderID)
				if err != nil {
					// If order not found, it's a zombie session
					log.Printf("Order %s not found for session cleanup, treating as zombie", *session.OrderID)
					shouldExpire = true
				} else if order.Status != models.OrderPending {
					// Order is COMPLETED or CANCELLED, but session still exists
					shouldExpire = true
				}
			}

			if shouldExpire {
				log.Printf("Expiring session for user %s on event %s", session.UserID, session.EventID)
				if err := s.queueRepo.RemoveFromActive(ctx, session.EventID, session.UserID); err != nil {
					log.Printf("Error removing user from active: %v", err)
				}
				if err := s.queueRepo.DeleteSession(ctx, session.Token, session.EventID, session.UserID); err != nil {
					log.Printf("Error deleting session: %v", err)
				}
			}
		} else {
			// Expired waiting session or other
			if err := s.queueRepo.DeleteSession(ctx, session.Token, session.EventID, session.UserID); err != nil {
				log.Printf("Error deleting expired session: %v", err)
			}
		}
	}
}

func (s *workerService) releaseExpiredOrders() {
	orders, err := s.orderRepo.GetExpiredOrders(100)
	if err != nil {
		log.Printf("Error fetching expired orders: %v", err)
		return
	}

	for _, order := range orders {
		log.Printf("Releasing expired order: %s", order.ID)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		seatIDs, err := s.orderRepo.ReleaseOrder(ctx, order.ID)
		if err != nil {
			log.Printf("Failed to release order %s: %v", order.ID, err)
			cancel()
			continue
		}

		// Remove user from Redis active set so new users can enter the queue
		if err := s.queueRepo.RemoveFromActive(ctx, order.EventID, order.UserID); err != nil {
			log.Printf("Failed to remove user %s from active set for event %s: %v", order.UserID, order.EventID, err)
		}

		// Delete the session so they have to re-enter the queue or get a fresh session
		session, err := s.queueRepo.GetSessionByEventAndUser(ctx, order.EventID, order.UserID)
		if err == nil && session != nil {
			if err := s.queueRepo.DeleteSession(ctx, session.Token, order.EventID, order.UserID); err != nil {
				log.Printf("Failed to delete session for user %s on event %s: %v", order.UserID, order.EventID, err)
			}
		}

		cancel()

		// Notify frontend via WS for released seats on the event channel
		channelName := fmt.Sprintf("event:%s", order.EventID)
		s.wsHub.Broadcast(channelName, map[string]interface{}{
			"type":     "SEATS_RELEASED",
			"seat_ids": seatIDs,
		})
	}
}

// sendEventReminders sends reminder notifications for events starting within 24 hours
func (s *workerService) sendEventReminders() {
	ctx := context.Background()
	now := time.Now().UTC()
	in24Hours := now.Add(24 * time.Hour)

	var events []models.Event
	if err := s.db.Where("is_published = ? AND start_time > ? AND start_time <= ?", true, now, in24Hours).
		Find(&events).Error; err != nil {
		log.Printf("[EventReminder] Error fetching upcoming events: %v", err)
		return
	}

	for _, event := range events {
		// Check Redis to avoid sending duplicate reminders
		reminderKey := fmt.Sprintf("reminder_sent:%s", event.ID)
		exists, err := s.rdb.Exists(ctx, reminderKey).Result()
		if err != nil {
			log.Printf("[EventReminder] Redis check error for event %s: %v", event.ID, err)
			continue
		}
		if exists > 0 {
			continue // Already sent reminder for this event
		}

		// Find users with tickets for this event
		userIDs, err := s.notifRepo.FindUsersWithTicketsForEvent(event.ID)
		if err != nil {
			log.Printf("[EventReminder] Error finding users for event %s: %v", event.ID, err)
			continue
		}

		if len(userIDs) == 0 {
			continue
		}

		s.notifSvc.SendEventReminderNotification(&event, userIDs)

		// Mark as sent — expires in 25 hours to prevent re-sending
		s.rdb.Set(ctx, reminderKey, "1", 25*time.Hour)
		log.Printf("[EventReminder] Sent reminders to %d users for event '%s'", len(userIDs), event.Title)
	}
}

// sendPaymentReminders sends reminder notifications for orders expiring within 5 minutes
func (s *workerService) sendPaymentReminders() {
	ctx := context.Background()

	orders, err := s.notifRepo.FindPendingOrdersExpiringSoon(5)
	if err != nil {
		log.Printf("[PaymentReminder] Error fetching expiring orders: %v", err)
		return
	}

	for _, order := range orders {
		// Check Redis to avoid duplicate reminders
		reminderKey := fmt.Sprintf("payment_reminder:%s", order.ID)
		exists, err := s.rdb.Exists(ctx, reminderKey).Result()
		if err != nil {
			continue
		}
		if exists > 0 {
			continue
		}

		s.notifSvc.SendPaymentReminderNotification(&order, order.UserID)

		// Mark as sent — expires in 15 minutes
		s.rdb.Set(ctx, reminderKey, "1", 15*time.Minute)
		log.Printf("[PaymentReminder] Sent payment reminder for order %s to user %s", order.ID, order.UserID)
	}
}
