package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type QueueRepository interface {
	AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error
	GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error)
	IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error)
	AllowUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error
	PopFromQueue(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, error)
	GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error)
	RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error
}

type queueRepo struct {
	rdb *redis.Client
}

func NewQueueRepository(rdb *redis.Client) QueueRepository {
	return &queueRepo{rdb: rdb}
}

func (r *queueRepo) AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	queueKey := fmt.Sprintf("event:%s:queue", eventID)
	// Convert userID to string for Redis
	return r.rdb.ZAdd(ctx, queueKey, redis.Z{
		Score:  float64(time.Now().UnixNano()),
		Member: userID.String(),
	}).Err()
}

func (r *queueRepo) GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error) {
	queueKey := fmt.Sprintf("event:%s:queue", eventID)
	// Convert userID to string for Redis
	return r.rdb.ZRank(ctx, queueKey, userID.String()).Result()
}

func (r *queueRepo) IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error) {
	activeKey := fmt.Sprintf("event:%s:active", eventID)
	// Convert userID to string for Redis
	return r.rdb.SIsMember(ctx, activeKey, userID.String()).Result()
}

func (r *queueRepo) AllowUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	activeKey := fmt.Sprintf("event:%s:active", eventID)
	queueKey := fmt.Sprintf("event:%s:queue", eventID)
	userStr := userID.String()

	pipe := r.rdb.Pipeline()
	pipe.SAdd(ctx, activeKey, userStr)
	pipe.ZRem(ctx, queueKey, userStr)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *queueRepo) PopFromQueue(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, error) {
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

func (r *queueRepo) GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error) {
	activeKey := fmt.Sprintf("event:%s:active", eventID)
	return r.rdb.SCard(ctx, activeKey).Result()
}

func (r *queueRepo) RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	activeKey := fmt.Sprintf("event:%s:active", eventID)
	// Convert userID to string for Redis
	return r.rdb.SRem(ctx, activeKey, userID.String()).Err()
}
