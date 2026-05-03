package repository

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
	"ticketrush/internal/config"
)

func NewRedisClient(cfg *config.Config) *redis.Client {
	addr := fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort)
	client := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	return client
}
