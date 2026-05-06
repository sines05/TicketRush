package repository

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type EventMetricsRepository interface {
	IncrEventView(ctx context.Context, eventID uuid.UUID, at time.Time) error
	GetEventViewsLastDays(ctx context.Context, eventIDs []uuid.UUID, days int, now time.Time) (map[uuid.UUID]int64, error)
}

type eventMetricsRepo struct {
	rdb *redis.Client
}

func NewEventMetricsRepository(rdb *redis.Client) EventMetricsRepository {
	return &eventMetricsRepo{rdb: rdb}
}

func (r *eventMetricsRepo) viewKey(eventID uuid.UUID, day time.Time) string {
	// day is always treated as UTC day bucket
	return fmt.Sprintf("event:%s:views:%s", eventID.String(), day.UTC().Format("20060102"))
}

func (r *eventMetricsRepo) IncrEventView(ctx context.Context, eventID uuid.UUID, at time.Time) error {
	key := r.viewKey(eventID, at)
	pipe := r.rdb.Pipeline()
	pipe.Incr(ctx, key)
	// Keep slightly more than 7 days so rolling windows work reliably.
	pipe.Expire(ctx, key, 8*24*time.Hour)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *eventMetricsRepo) GetEventViewsLastDays(ctx context.Context, eventIDs []uuid.UUID, days int, now time.Time) (map[uuid.UUID]int64, error) {
	out := make(map[uuid.UUID]int64, len(eventIDs))
	if len(eventIDs) == 0 {
		return out, nil
	}
	if days <= 0 {
		days = 7
	}

	pipe := r.rdb.Pipeline()
	type pending struct {
		eventID uuid.UUID
		cmd     *redis.StringCmd
	}
	pendingCmds := make([]pending, 0, len(eventIDs)*days)

	for d := 0; d < days; d++ {
		day := now.UTC().AddDate(0, 0, -d)
		for _, id := range eventIDs {
			cmd := pipe.Get(ctx, r.viewKey(id, day))
			pendingCmds = append(pendingCmds, pending{eventID: id, cmd: cmd})
		}
	}

	_, err := pipe.Exec(ctx)
	if err != nil && err != redis.Nil {
		// If some keys are missing, Redis returns redis.Nil per command; pipeline Exec may still return nil.
		return nil, err
	}

	for _, p := range pendingCmds {
		val, cmdErr := p.cmd.Result()
		if cmdErr == redis.Nil {
			continue
		}
		if cmdErr != nil {
			return nil, cmdErr
		}
		n, parseErr := strconv.ParseInt(val, 10, 64)
		if parseErr != nil {
			continue
		}
		out[p.eventID] += n
	}

	return out, nil
}
