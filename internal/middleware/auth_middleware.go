package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"ticketrush/internal/models"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
)

func AuthMiddleware(authService service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var token string

		// 1. Try to get token from cookie
		cookieToken, err := c.Cookie("tr_access_token")
		if err == nil {
			token = cookieToken
		}

		// 2. Fallback to Authorization header
		if token == "" {
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && parts[0] == "Bearer" {
					token = parts[1]
				}
			}
		}

		if token == "" {
			utils.SendError(c, http.StatusUnauthorized, "Authorization required", "AUTH_REQUIRED")
			c.Abort()
			return
		}

		user, is2FAVerified, err := authService.ValidateToken(token)
		if err != nil {
			utils.SendError(c, http.StatusUnauthorized, err.Error(), "INVALID_TOKEN")
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Set("2fa_verified", is2FAVerified)
		c.Next()
	}
}

func RoleMiddleware(requiredRole models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			utils.SendError(c, http.StatusUnauthorized, "User not authenticated", "AUTH_REQUIRED")
			c.Abort()
			return
		}

		u := user.(*models.User)
		if u.Role != requiredRole {
			utils.SendError(c, http.StatusForbidden, "Insufficient permissions", "FORBIDDEN")
			c.Abort()
			return
		}

		c.Next()
	}
}
