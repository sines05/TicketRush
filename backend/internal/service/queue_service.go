package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"ticketrush/internal/repository"
)

const ActiveUserThreshold = 100

type QueueService interface {
	JoinQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, error)
	GetStatus(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, int64, error)
	ProcessQueue(ctx context.Context, eventID uuid.UUID) error
}

type queueService struct {
	queueRepo repository.QueueRepository
}

func NewQueueService(queueRepo repository.QueueRepository) QueueService {
	return &queueService{
		queueRepo: queueRepo,
	}
}

func (s *queueService) JoinQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, error) {
	// Check if already allowed
	allowed, err := s.queueRepo.IsAllowed(ctx, eventID, userID)
	if err != nil {
		return "", err
	}
	if allowed {
		return "allowed", nil
	}

	// Add to queue
	if err := s.queueRepo.AddToQueue(ctx, eventID, userID); err != nil {
		return "", err
	}

	return "waiting", nil
}

func (s *queueService) GetStatus(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, int64, error) {
	allowed, err := s.queueRepo.IsAllowed(ctx, eventID, userID)
	if err != nil {
		return "", 0, err
	}
	if allowed {
		return "allowed", 0, nil
	}

	pos, err := s.queueRepo.GetPosition(ctx, eventID, userID)
	if err != nil {
		return "not_in_queue", 0, nil
	}

	return "waiting", pos + 1, nil
}

func (s *queueService) ProcessQueue(ctx context.Context, eventID uuid.UUID) error {
	count, err := s.queueRepo.GetCurrentActiveCount(ctx, eventID)
	if err != nil {
		return err
	}

	if count >= ActiveUserThreshold {
		return nil // Queue is full
	}

	numToAdmit := int(ActiveUserThreshold) - int(count)
	users, err := s.queueRepo.PopFromQueue(ctx, eventID, numToAdmit)
	if err != nil {
		return err
	}

	for _, userID := range users {
		if err := s.queueRepo.AllowUser(ctx, eventID, userID); err != nil {
			fmt.Printf("Error admitting user %s: %v\n", userID, err)
		}
	}

	return nil
}
