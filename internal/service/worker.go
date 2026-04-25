package service

import (
	"context"
	"log"
	"time"

	"gorm.io/gorm"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
)

type WorkerService interface {
	StartWorkers()
}

type workerService struct {
	db           *gorm.DB
	queueService QueueService
	wsHub        *repository.Hub
	orderRepo    repository.OrderRepository
}

func NewWorkerService(db *gorm.DB, queueService QueueService, wsHub *repository.Hub, orderRepo repository.OrderRepository) WorkerService {
	return &workerService{
		db:           db,
		queueService: queueService,
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
		cancel()

		// Notify frontend via WS for each released seat
		for _, seatID := range seatIDs {
			s.wsHub.Broadcast(map[string]interface{}{
				"type":    "SEAT_RELEASED",
				"seat_id": seatID,
			})
		}
	}
}

