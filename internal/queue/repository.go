package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type Repository interface {
	AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error
	GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error)
	IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error)
	AllowUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error
	PopFromQueue(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, error)
	GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error)
	RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error

	// Session management
	SaveSession(ctx context.Context, session *QueueSession, expiration time.Duration) error
	GetSession(ctx context.Context, token string) (*QueueSession, error)
	GetSessionByEventAndUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (*QueueSession, error)
}

type repository struct {
	rdb *redis.Client
}

func NewRepository(rdb *redis.Client) Repository {
	return &repository{rdb: rdb}
}

func (r *repository) AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	queueKey := fmt.Sprintf("event:%s:queue", eventID)
	return r.rdb.ZAdd(ctx, queueKey, redis.Z{
		Score:  float64(time.Now().UnixNano()),
		Member: userID.String(),
	}).Err()
}

func (r *repository) GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error) {
	queueKey := fmt.Sprintf("event:%s:queue", eventID)
	return r.rdb.ZRank(ctx, queueKey, userID.String()).Result()
}

func (r *repository) IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error) {
	activeKey := fmt.Sprintf("event:%s:active", eventID)
	return r.rdb.SIsMember(ctx, activeKey, userID.String()).Result()
}

func (r *repository) AllowUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	activeKey := fmt.Sprintf("event:%s:active", eventID)
	queueKey := fmt.Sprintf("event:%s:queue", eventID)
	userStr := userID.String()

	pipe := r.rdb.Pipeline()
	pipe.SAdd(ctx, activeKey, userStr)
	pipe.ZRem(ctx, queueKey, userStr)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *repository) PopFromQueue(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, error) {
	queueKey := fmt.Sprintf("event:%s:queue", eventID)
	members, err := r.rdb.ZRange(ctx, queueKey, 0, int64(count-1)).Result()
	if err != nil {
		return nil, err
	}

	var userIDs []uuid.UUID
	for _, m := range members {
		id, err := uuid.Parse(m)
		if err != nil {
			continue
		}
		userIDs = append(userIDs, id)
	}
	return userIDs, nil
}

func (r *repository) GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error) {
	activeKey := fmt.Sprintf("event:%s:active", eventID)
	return r.rdb.SCard(ctx, activeKey).Result()
}

func (r *repository) RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	activeKey := fmt.Sprintf("event:%s:active", eventID)
	return r.rdb.SRem(ctx, activeKey, userID.String()).Err()
}

func (r *repository) SaveSession(ctx context.Context, session *QueueSession, expiration time.Duration) error {
	tokenKey := fmt.Sprintf("queue_session:%s", session.Token)
	lookupKey := fmt.Sprintf("queue_session_lookup:%s:%s", session.EventID, session.UserID)
	
	data, err := json.Marshal(session)
	if err != nil {
		return err
	}
	
	pipe := r.rdb.Pipeline()
	pipe.Set(ctx, tokenKey, data, expiration)
	pipe.Set(ctx, lookupKey, session.Token, expiration)
	_, err = pipe.Exec(ctx)
	return err
}

func (r *repository) GetSession(ctx context.Context, token string) (*QueueSession, error) {
	tokenKey := fmt.Sprintf("queue_session:%s", token)
	data, err := r.rdb.Get(ctx, tokenKey).Bytes()
	if err != nil {
		return nil, err
	}
	var session QueueSession
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *repository) GetSessionByEventAndUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (*QueueSession, error) {
	lookupKey := fmt.Sprintf("queue_session_lookup:%s:%s", eventID, userID)
	token, err := r.rdb.Get(ctx, lookupKey).Result()
	if err != nil {
		return nil, err
	}
	return r.GetSession(ctx, token)
}
