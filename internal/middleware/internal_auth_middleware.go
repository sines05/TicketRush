package middleware

import (
	"net/http"
	"ticketrush/internal/config"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
)

func InternalAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		secret := c.GetHeader("X-Internal-Secret")
		if secret == "" || secret != cfg.InternalSecret {
			utils.SendError(c, http.StatusUnauthorized, "Unauthorized internal access", "UNAUTHORIZED_INTERNAL")
			c.Abort()
			return
		}
		c.Next()
	}
}
