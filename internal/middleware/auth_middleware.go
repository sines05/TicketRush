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
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.SendError(c, http.StatusUnauthorized, "Authorization header required", "AUTH_REQUIRED")
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.SendError(c, http.StatusUnauthorized, "Invalid authorization format", "INVALID_AUTH")
			c.Abort()
			return
		}

		user, err := authService.ValidateToken(parts[1])
		if err != nil {
			utils.SendError(c, http.StatusUnauthorized, err.Error(), "INVALID_TOKEN")
			c.Abort()
			return
		}

		c.Set("user", user)
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
