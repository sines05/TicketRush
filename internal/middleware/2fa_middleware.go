package middleware

import (
	"net/http"
	"ticketrush/internal/models"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
)

// TwoFactorMiddleware checks if the user has 2FA enabled and if they have verified it for the current session.
// In a real app, you'd store a "2fa_verified" flag in the JWT or a separate session/Redis entry.
// For this project, we'll assume that if 2FA is enabled, the user MUST have verified it to reach protected routes
// that are wrapped with this middleware.
func TwoFactorMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			utils.SendError(c, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
			c.Abort()
			return
		}

		u := user.(*models.User)
		if u.TwoFactorEnabled {
			isVerified, _ := c.Get("2fa_verified")
			if verified, ok := isVerified.(bool); !ok || !verified {
				utils.SendError(c, http.StatusForbidden, "Two-factor authentication required", "2FA_REQUIRED")
				c.Abort()
				return
			}
		}

		c.Next()
	}
}
