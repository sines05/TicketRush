package middleware

import (
	"net/http"
	"strings"
	"ticketrush/internal/config"

	"github.com/gin-gonic/gin"
)

// CSRFMiddleware provides a simple CSRF protection by verifying Origin or Referer headers.
// It only checks state-changing requests (non-GET, non-HEAD, non-OPTIONS).
func CSRFMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip for safe methods
		method := c.Request.Method
		if method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions {
			c.Next()
			return
		}

		origin := c.GetHeader("Origin")
		referer := c.GetHeader("Referer")

		// Check Origin first
		if origin != "" {
			if origin != cfg.FrontendURL {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF protection: invalid origin"})
				return
			}
		} else if referer != "" {
			// Fallback to Referer
			if !strings.HasPrefix(referer, cfg.FrontendURL) {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF protection: invalid referer"})
				return
			}
		} else {
			// Both missing for state-changing request
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF protection: missing origin/referer"})
			return
		}

		c.Next()
	}
}
