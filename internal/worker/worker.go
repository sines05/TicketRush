package worker

import (
	"context"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
	"ticketrush/internal/models"
	"ticketrush/internal/queue"
	"ticketrush/internal/repository"
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
}

func NewWorkerService(db *gorm.DB, queueService queue.Service, queueRepo queue.Repository, wsHub *websocket.Hub, orderRepo repository.OrderRepository) WorkerService {
	return &workerService{
		db:           db,
		queueService: queueService,
		queueRepo:    queueRepo,
		wsHub:        wsHub,
		orderRepo:    orderRepo,
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

					// If anyone was admitted, update positions for everyone else
					if len(admitted) > 0 {
						currentIndex, _ := s.queueRepo.GetProcessedIndex(ctx, event.ID)
						channelName := fmt.Sprintf("event:%s", event.ID)
						s.wsHub.Broadcast(channelName, map[string]interface{}{
							"type":          "QUEUE_UPDATE",
							"event_id":      event.ID,
							"current_index": currentIndex,
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
