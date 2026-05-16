package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"ticketrush/internal/service"
)

func OptionalAuthMiddleware(authService service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		user, _, err := authService.ValidateToken(parts[1])
		if err != nil {
			c.Next()
			return
		}

		c.Set("user", user)
		c.Next()
	}
}
