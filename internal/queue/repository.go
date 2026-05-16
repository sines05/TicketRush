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
	AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID, priorityLevel int) error
	GetPosition(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (int64, error)
	IsAllowed(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (bool, error)
	AllowUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error
	PopFromQueue(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, error)
	PopFromQueueAndIncrementProcessedIndex(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, int64, error)
	GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error)
	RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error

	// Global Offset Broadcast
	GetNextJoinIndex(ctx context.Context, eventID uuid.UUID) (int64, error)
	GetProcessedIndex(ctx context.Context, eventID uuid.UUID) (int64, error)
	IncrementProcessedIndex(ctx context.Context, eventID uuid.UUID, count int) (int64, error)

	// Session management
	SaveSession(ctx context.Context, session *QueueSession, expiration time.Duration) error
	GetSession(ctx context.Context, token string) (*QueueSession, error)
	GetSessionByEventAndUser(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (*QueueSession, error)
	ListSessions(ctx context.Context) ([]*QueueSession, error)
	GetExpiredSessions(ctx context.Context, limit int) ([]string, error)
	DeleteSession(ctx context.Context, token string, eventID uuid.UUID, userID uuid.UUID) error
	GetAllQueueUsers(ctx context.Context, eventID uuid.UUID) ([]uuid.UUID, error)
	GetOrCreateSessionAtomic(ctx context.Context, session *QueueSession, expiration time.Duration, incrementJoinIndex bool) (*QueueSession, bool, error)
}

type repository struct {
	rdb *redis.Client
}

func NewRepository(rdb *redis.Client) Repository {
	return &repository{rdb: rdb}
}

func (r *repository) AddToQueue(ctx context.Context, eventID uuid.UUID, userID uuid.UUID, priorityLevel int) error {
	queueKey := fmt.Sprintf("event:%s:queue", eventID)
	// Score calculation: (10 - priorityLevel) * 10^18 + time.Now().UnixNano()
	// This ensures higher priority levels always get a strictly lower score than lower priority levels.
	score := float64((10-priorityLevel))*1e18 + float64(time.Now().UnixNano())
	return r.rdb.ZAdd(ctx, queueKey, redis.Z{
		Score:  score,
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

func (r *repository) PopFromQueueAndIncrementProcessedIndex(ctx context.Context, eventID uuid.UUID, count int) ([]uuid.UUID, int64, error) {
	queueKey := fmt.Sprintf("event:%s:queue", eventID)
	processedKey := fmt.Sprintf("queue:event:%s:processed_counter", eventID)

	script := `
		local queueKey = KEYS[1]
		local processedKey = KEYS[2]
		local count = tonumber(ARGV[1])

		local members = redis.call('ZRANGE', queueKey, 0, count - 1)
		if #members > 0 then
			redis.call('ZREM', queueKey, unpack(members))
			local newCounter = redis.call('INCRBY', processedKey, #members)
			return {members, newCounter}
		else
			local currentCounter = redis.call('GET', processedKey)
			if not currentCounter then currentCounter = 0 end
			return {{}, tonumber(currentCounter)}
		end
	`

	res, err := r.rdb.Eval(ctx, script, []string{queueKey, processedKey}, count).Result()
	if err != nil {
		return nil, 0, err
	}

	slice := res.([]interface{})
	memberStrings := slice[0].([]interface{})
	newCounter := slice[1].(int64)

	var userIDs []uuid.UUID
	for _, m := range memberStrings {
		id, err := uuid.Parse(m.(string))
		if err != nil {
			continue
		}
		userIDs = append(userIDs, id)
	}

	return userIDs, newCounter, nil
}

func (r *repository) GetCurrentActiveCount(ctx context.Context, eventID uuid.UUID) (int64, error) {
	activeKey := fmt.Sprintf("event:%s:active", eventID)
	return r.rdb.SCard(ctx, activeKey).Result()
}

func (r *repository) RemoveFromActive(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	activeKey := fmt.Sprintf("event:%s:active", eventID)
	return r.rdb.SRem(ctx, activeKey, userID.String()).Err()
}

func (r *repository) GetNextJoinIndex(ctx context.Context, eventID uuid.UUID) (int64, error) {
	counterKey := fmt.Sprintf("queue:event:%s:counter", eventID)
	return r.rdb.Incr(ctx, counterKey).Result()
}

func (r *repository) GetProcessedIndex(ctx context.Context, eventID uuid.UUID) (int64, error) {
	processedKey := fmt.Sprintf("queue:event:%s:processed_counter", eventID)
	val, err := r.rdb.Get(ctx, processedKey).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return val, err
}

func (r *repository) IncrementProcessedIndex(ctx context.Context, eventID uuid.UUID, count int) (int64, error) {
	processedKey := fmt.Sprintf("queue:event:%s:processed_counter", eventID)
	return r.rdb.IncrBy(ctx, processedKey, int64(count)).Result()
}

func (r *repository) SaveSession(ctx context.Context, session *QueueSession, expiration time.Duration) error {
	tokenKey := fmt.Sprintf("queue_session:%s", session.Token)
	lookupKey := fmt.Sprintf("queue_session_lookup:%s:%s", session.EventID, session.UserID)
	expiryKey := "sessions:expiry"
	
	data, err := json.Marshal(session)
	if err != nil {
		return err
	}
	
	// Business expiry for ZSET: 
	// 1. If order exists, use order expiry
	// 2. If allowed, use AllowedAt + 15m30s
	// 3. Otherwise use the provided expiration (default 2h)
	var expiryTime int64
	if session.ExpiresAt != nil {
		expiryTime = session.ExpiresAt.Unix()
	} else if session.AllowedAt != nil {
		expiryTime = session.AllowedAt.Add(15*time.Minute + 30*time.Second).Unix()
	} else {
		expiryTime = time.Now().Add(expiration).Unix()
	}

	pipe := r.rdb.Pipeline()
	pipe.Set(ctx, tokenKey, data, expiration)
	pipe.Set(ctx, lookupKey, session.Token, expiration)
	pipe.ZAdd(ctx, expiryKey, redis.Z{
		Score:  float64(expiryTime),
		Member: session.Token,
	})
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

func (r *repository) ListSessions(ctx context.Context) ([]*QueueSession, error) {
	var sessions []*QueueSession
	iter := r.rdb.Scan(ctx, 0, "queue_session:*", 0).Iterator()
	for iter.Next(ctx) {
		data, err := r.rdb.Get(ctx, iter.Val()).Bytes()
		if err != nil {
			continue
		}
		var session QueueSession
		if err := json.Unmarshal(data, &session); err != nil {
			continue
		}
		sessions = append(sessions, &session)
	}
	if err := iter.Err(); err != nil {
		return nil, err
	}
	return sessions, nil
}

func (r *repository) GetExpiredSessions(ctx context.Context, limit int) ([]string, error) {
	expiryKey := "sessions:expiry"
	now := time.Now().Unix()
	return r.rdb.ZRangeByScore(ctx, expiryKey, &redis.ZRangeBy{
		Min:    "-inf",
		Max:    fmt.Sprintf("%d", now),
		Offset: 0,
		Count:  int64(limit),
	}).Result()
}

func (r *repository) DeleteSession(ctx context.Context, token string, eventID uuid.UUID, userID uuid.UUID) error {
	tokenKey := fmt.Sprintf("queue_session:%s", token)
	lookupKey := fmt.Sprintf("queue_session_lookup:%s:%s", eventID, userID)
	expiryKey := "sessions:expiry"
	
	pipe := r.rdb.Pipeline()
	pipe.Del(ctx, tokenKey, lookupKey)
	pipe.ZRem(ctx, expiryKey, token)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *repository) GetAllQueueUsers(ctx context.Context, eventID uuid.UUID) ([]uuid.UUID, error) {
	queueKey := fmt.Sprintf("event:%s:queue", eventID)
	members, err := r.rdb.ZRange(ctx, queueKey, 0, -1).Result()
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

func (r *repository) GetOrCreateSessionAtomic(ctx context.Context, session *QueueSession, expiration time.Duration, incrementJoinIndex bool) (*QueueSession, bool, error) {
	tokenKey := fmt.Sprintf("queue_session:%s", session.Token)
	lookupKey := fmt.Sprintf("queue_session_lookup:%s:%s", session.EventID, session.UserID)
	counterKey := fmt.Sprintf("queue:event:%s:counter", session.EventID)
	expiryKey := "sessions:expiry"

	data, err := json.Marshal(session)
	if err != nil {
		return nil, false, err
	}

	var expiryTime int64
	if session.ExpiresAt != nil {
		expiryTime = session.ExpiresAt.Unix()
	} else if session.AllowedAt != nil {
		expiryTime = session.AllowedAt.Add(15*time.Minute + 30*time.Second).Unix()
	} else {
		expiryTime = time.Now().Add(expiration).Unix()
	}

	script := `
		local lookupKey = KEYS[1]
		local tokenKey = KEYS[2]
		local counterKey = KEYS[3]
		local expiryKey = KEYS[4]

		local sessionJSON = ARGV[1]
		local expiration = tonumber(ARGV[2])
		local shouldIncrement = tonumber(ARGV[3])
		local token = ARGV[4]
		local expiryScore = tonumber(ARGV[5])

		local existingToken = redis.call('GET', lookupKey)
		if existingToken then
			local existingSessionJSON = redis.call('GET', "queue_session:" .. existingToken)
			if existingSessionJSON then
				return {existingSessionJSON, "0"}
			end
		end

		local joinIndex = 0
		if shouldIncrement == 1 then
			joinIndex = redis.call('INCR', counterKey)
			local data = cjson.decode(sessionJSON)
			data.join_index = tonumber(joinIndex)
			sessionJSON = cjson.encode(data)
		end

		redis.call('SET', tokenKey, sessionJSON, 'EX', expiration)
		redis.call('SET', lookupKey, token, 'EX', expiration)
		redis.call('ZADD', expiryKey, expiryScore, token)

		return {sessionJSON, "1"}
	`

	shouldInc := 0
	if incrementJoinIndex {
		shouldInc = 1
	}

	res, err := r.rdb.Eval(ctx, script, []string{lookupKey, tokenKey, counterKey, expiryKey},
		data, int(expiration.Seconds()), shouldInc, session.Token, expiryTime).Result()
	if err != nil {
		return nil, false, err
	}

	slice := res.([]interface{})
	returnedJSON := slice[0].(string)
	createdStr := slice[1].(string)

	var finalSession QueueSession
	if err := json.Unmarshal([]byte(returnedJSON), &finalSession); err != nil {
		return nil, false, err
	}

	return &finalSession, createdStr == "1", nil
}
