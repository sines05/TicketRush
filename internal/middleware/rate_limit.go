package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"ticketrush/internal/utils"
)

// RateLimitMiddleware provides a Redis-based fixed window rate limiter.
// It limits requests based on the client's IP address and the request path.
func RateLimitMiddleware(redisClient *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Use IP and Path as the key to limit per endpoint per user
		key := fmt.Sprintf("rate_limit:%s:%s", c.FullPath(), c.ClientIP())
		ctx := c.Request.Context()

		count, err := redisClient.Incr(ctx, key).Result()
		if err != nil {
			// If Redis is unavailable, we allow the request to proceed
			// to avoid blocking users due to infrastructure issues.
			c.Next()
			return
		}

		// If this is the first request in the window, set the expiration
		if count == 1 {
			redisClient.Expire(ctx, key, window)
		}

		if count > int64(limit) {
			utils.SendError(c, http.StatusTooManyRequests, "Too many requests. Please try again later.", "RATE_LIMIT_EXCEEDED")
			c.Abort()
			return
		}

		c.Next()
	}
}
