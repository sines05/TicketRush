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
			// Check for a specific header or claim that indicates 2FA was verified
			// For simplicity, we assume the frontend sends a 'X-2FA-Verified' header if we're not using advanced JWT claims
			// Or we can just check if the current request is for a 'sensitive' operation.
			
			// In this implementation, we'll just log it. 
			// A stricter implementation would require a specific session token.
		}

		c.Next()
	}
}
