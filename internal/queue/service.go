package queue

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"log"
	coreRepo "ticketrush/internal/repository"
	"ticketrush/internal/utils"
	"time"

	"github.com/google/uuid"
)

const ActiveUserThreshold = 100
const SessionExpiration = 2 * time.Hour

type Service interface {
	JoinQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, string, int64, int64, *time.Time, error)
	GetStatus(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, int64, int64, string, *time.Time, error)
	ProcessQueue(ctx context.Context, eventID uuid.UUID) ([]*QueueSession, error)
	GetSession(ctx context.Context, token string) (*QueueSession, error)
	UpdateSessionOrder(ctx context.Context, token string, orderID uuid.UUID, expiresAt time.Time) error
	GetAllQueueUsers(ctx context.Context, eventID uuid.UUID) ([]uuid.UUID, error)
}

type service struct {
	repo      Repository
	userRepo  coreRepo.UserRepository
	eventRepo coreRepo.EventRepository
}

func NewService(repo Repository, userRepo coreRepo.UserRepository, eventRepo coreRepo.EventRepository) Service {
	return &service{repo: repo, userRepo: userRepo, eventRepo: eventRepo}
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func (s *service) getOrCreateSession(ctx context.Context, eventID uuid.UUID, userID uuid.UUID, status string, incrementJoinIndex bool) (*QueueSession, error) {
	session := &QueueSession{
		Token:     generateToken(),
		UserID:    userID,
		EventID:   eventID,
		Status:    status,
	}
	if status == "allowed" {
		now := time.Now().UTC()
		session.AllowedAt = &now
	}

	finalSession, _, err := s.repo.GetOrCreateSessionAtomic(ctx, session, SessionExpiration, incrementJoinIndex)
	if err != nil {
		return nil, err
	}

	// If session already existed, check if status needs update
	if finalSession.Status != status {
		finalSession.Status = status
		if status == "allowed" && finalSession.AllowedAt == nil {
			now := time.Now().UTC()
			finalSession.AllowedAt = &now
		}
		s.repo.SaveSession(ctx, finalSession, SessionExpiration)
	}

	return finalSession, nil
}

func (s *service) JoinQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, string, int64, int64, *time.Time, error) {
	event, err := s.eventRepo.GetEventByID(eventID)
	if err != nil {
		return "", "", 0, 0, nil, utils.ErrEventNotFound
	}

	if event.StartTime.Before(time.Now().UTC()) {
		return "", "", 0, 0, nil, utils.ErrEventAlreadyStarted
	}

	allowed, err := s.repo.IsAllowed(ctx, eventID, userID)
	if err != nil {
		return "", "", 0, 0, nil, err
	}
	
	priorityLevel := 0
	user, err := s.userRepo.FindByID(userID)
	if err == nil && user != nil && user.MembershipTier != nil {
		priorityLevel = user.MembershipTier.PriorityLevel
	}

	status := "waiting"
	incrementJoinIndex := false
	if allowed {
		status = "allowed"
	} else if priorityLevel >= 3 {
		// Platinum users bypass the queue threshold and go straight to active
		if err := s.repo.AllowUser(ctx, eventID, userID); err != nil {
			return "", "", 0, 0, nil, err
		}
		status = "allowed"
	} else {
		if err := s.repo.AddToQueue(ctx, eventID, userID, priorityLevel); err != nil {
			return "", "", 0, 0, nil, err
		}
		incrementJoinIndex = true
	}

	session, err := s.getOrCreateSession(ctx, eventID, userID, status, incrementJoinIndex)
	if err != nil {
		return "", "", 0, 0, nil, err
	}

	processedIndex, _ := s.repo.GetProcessedIndex(ctx, eventID)

	return session.Status, session.Token, session.JoinIndex, processedIndex, session.AllowedAt, nil
}

func (s *service) GetStatus(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, int64, int64, string, *time.Time, error) {
	allowed, err := s.repo.IsAllowed(ctx, eventID, userID)
	if err != nil {
		return "", 0, 0, "", nil, err
	}
	
	status := "waiting"
	if allowed {
		status = "allowed"
	} else {
		priorityLevel := 0
		user, err := s.userRepo.FindByID(userID)
		if err == nil && user != nil && user.MembershipTier != nil {
			priorityLevel = user.MembershipTier.PriorityLevel
		}
		
		if priorityLevel >= 3 {
			if err := s.repo.AllowUser(ctx, eventID, userID); err == nil {
				status = "allowed"
			}
		}
	}

	session, err := s.getOrCreateSession(ctx, eventID, userID, status, false)
	if err != nil {
		return "", 0, 0, "", nil, err
	}

	processedIndex, _ := s.repo.GetProcessedIndex(ctx, eventID)

	return session.Status, session.JoinIndex, processedIndex, session.Token, session.AllowedAt, nil
}

func (s *service) ProcessQueue(ctx context.Context, eventID uuid.UUID) ([]*QueueSession, error) {
	count, err := s.repo.GetCurrentActiveCount(ctx, eventID)
	if err != nil {
		return nil, err
	}

	if count >= ActiveUserThreshold {
		return nil, nil
	}

	numToAdmit := int(ActiveUserThreshold) - int(count)
	users, _, err := s.repo.PopFromQueueAndIncrementProcessedIndex(ctx, eventID, numToAdmit)
	if err != nil {
		return nil, err
	}

	var admittedSessions []*QueueSession
	for _, userID := range users {
		if err := s.repo.AllowUser(ctx, eventID, userID); err != nil {
			log.Printf("Error admitting user %s: %v", userID, err)
			continue
		}
		session, err := s.repo.GetSessionByEventAndUser(ctx, eventID, userID)
		if err == nil && session != nil {
			session.Status = "allowed"
			if session.AllowedAt == nil {
				now := time.Now().UTC()
				session.AllowedAt = &now
			}
			s.repo.SaveSession(ctx, session, SessionExpiration)
			admittedSessions = append(admittedSessions, session)
		}
	}

	return admittedSessions, nil
}

func (s *service) GetSession(ctx context.Context, token string) (*QueueSession, error) {
	return s.repo.GetSession(ctx, token)
}

func (s *service) UpdateSessionOrder(ctx context.Context, token string, orderID uuid.UUID, expiresAt time.Time) error {
	session, err := s.repo.GetSession(ctx, token)
	if err != nil {
		return err
	}
	session.OrderID = &orderID
	session.ExpiresAt = &expiresAt
	return s.repo.SaveSession(ctx, session, SessionExpiration)
}

func (s *service) GetAllQueueUsers(ctx context.Context, eventID uuid.UUID) ([]uuid.UUID, error) {
	return s.repo.GetAllQueueUsers(ctx, eventID)
}
