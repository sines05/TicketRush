package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"ticketrush/internal/service"
)

func OptionalAuthMiddleware(authService service.AuthService) gin.HandlerFunc {
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
			c.Next()
			return
		}

		user, is2FAVerified, err := authService.ValidateToken(token)
		if err != nil {
			c.Next()
			return
		}

		c.Set("user", user)
		c.Set("2fa_verified", is2FAVerified)
		c.Next()
	}
}
