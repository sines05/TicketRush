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
				if err := s.queueService.ProcessQueue(ctx, event.ID); err != nil {
					log.Printf("Error processing queue for event %s: %v", event.ID, err)
				}
				cancel()
			}
		}
	}()

	// Session Timeout Worker
	tickerSessions := time.NewTicker(1 * time.Minute)
	go func() {
		for range tickerSessions.C {
			s.releaseExpiredSessions()
		}
	}()
}

func (s *workerService) releaseExpiredSessions() {
	ctx := context.Background()
	sessions, err := s.queueRepo.ListSessions(ctx)
	if err != nil {
		log.Printf("Error listing sessions: %v", err)
		return
	}

	now := time.Now().UTC()
	for _, session := range sessions {
		if session.Status == "allowed" && session.OrderID == nil && session.AllowedAt != nil {
			if now.Sub(*session.AllowedAt) > 15*time.Minute+30*time.Second {
				log.Printf("Expiring session for user %s on event %s", session.UserID, session.EventID)
				if err := s.queueRepo.RemoveFromActive(ctx, session.EventID, session.UserID); err != nil {
					log.Printf("Error removing user from active: %v", err)
				}
				if err := s.queueRepo.DeleteSession(ctx, session.Token, session.EventID, session.UserID); err != nil {
					log.Printf("Error deleting session: %v", err)
				}
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

		// Clear OrderID from the session so they don't see the expired countdown
		session, err := s.queueRepo.GetSessionByEventAndUser(ctx, order.EventID, order.UserID)
		if err == nil && session != nil {
			session.OrderID = nil
			session.ExpiresAt = nil
			s.queueRepo.SaveSession(ctx, session, queue.SessionExpiration)
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
