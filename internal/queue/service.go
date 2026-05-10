package queue

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	coreRepo "ticketrush/internal/repository"
	"time"

	"github.com/google/uuid"
)

const ActiveUserThreshold = 100
const SessionExpiration = 2 * time.Hour

type Service interface {
	JoinQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, string, *time.Time, error)
	GetStatus(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, int64, string, *time.Time, error)
	ProcessQueue(ctx context.Context, eventID uuid.UUID) error
	GetSession(ctx context.Context, token string) (*QueueSession, error)
	UpdateSessionOrder(ctx context.Context, token string, orderID uuid.UUID, expiresAt time.Time) error
}

type service struct {
	repo     Repository
	userRepo coreRepo.UserRepository
}

func NewService(repo Repository, userRepo coreRepo.UserRepository) Service {
	return &service{repo: repo, userRepo: userRepo}
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func (s *service) getOrCreateSession(ctx context.Context, eventID uuid.UUID, userID uuid.UUID, status string) (*QueueSession, error) {
	session, err := s.repo.GetSessionByEventAndUser(ctx, eventID, userID)
	if err == nil && session != nil {
		if session.Status != status {
			session.Status = status
			if status == "allowed" && session.AllowedAt == nil {
				now := time.Now().UTC()
				session.AllowedAt = &now
			}
			s.repo.SaveSession(ctx, session, SessionExpiration)
		}
		return session, nil
	}

	session = &QueueSession{
		Token:   generateToken(),
		UserID:  userID,
		EventID: eventID,
		Status:  status,
	}
	if status == "allowed" {
		now := time.Now().UTC()
		session.AllowedAt = &now
	}
	err = s.repo.SaveSession(ctx, session, SessionExpiration)
	return session, err
}

func (s *service) JoinQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, string, *time.Time, error) {
	allowed, err := s.repo.IsAllowed(ctx, eventID, userID)
	if err != nil {
		return "", "", nil, err
	}
	
	priorityLevel := 0
	user, err := s.userRepo.FindByID(userID)
	if err == nil && user != nil && user.MembershipTier != nil {
		priorityLevel = user.MembershipTier.PriorityLevel
	}

	status := "waiting"
	if allowed {
		status = "allowed"
	} else if priorityLevel >= 3 {
		// Platinum users bypass the queue threshold and go straight to active
		if err := s.repo.AllowUser(ctx, eventID, userID); err != nil {
			return "", "", nil, err
		}
		status = "allowed"
	} else {
		if err := s.repo.AddToQueue(ctx, eventID, userID, priorityLevel); err != nil {
			return "", "", nil, err
		}
	}

	session, err := s.getOrCreateSession(ctx, eventID, userID, status)
	if err != nil {
		return "", "", nil, err
	}

	return session.Status, session.Token, session.AllowedAt, nil
}

func (s *service) GetStatus(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (string, int64, string, *time.Time, error) {
	allowed, err := s.repo.IsAllowed(ctx, eventID, userID)
	if err != nil {
		return "", 0, "", nil, err
	}
	
	status := "waiting"
	var pos int64 = 0
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
		} else {
			pos, err = s.repo.GetPosition(ctx, eventID, userID)
			if err != nil {
				status = "not_in_queue"
			} else {
				pos += 1
			}
		}
	}

	session, err := s.getOrCreateSession(ctx, eventID, userID, status)
	if err != nil {
		return "", 0, "", nil, err
	}

	return session.Status, pos, session.Token, session.AllowedAt, nil
}

func (s *service) ProcessQueue(ctx context.Context, eventID uuid.UUID) error {
	count, err := s.repo.GetCurrentActiveCount(ctx, eventID)
	if err != nil {
		return err
	}

	if count >= ActiveUserThreshold {
		return nil
	}

	numToAdmit := int(ActiveUserThreshold) - int(count)
	users, err := s.repo.PopFromQueue(ctx, eventID, numToAdmit)
	if err != nil {
		return err
	}

	for _, userID := range users {
		if err := s.repo.AllowUser(ctx, eventID, userID); err != nil {
			fmt.Printf("Error admitting user %s: %v\n", userID, err)
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
		}
	}

	return nil
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
