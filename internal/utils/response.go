package utils

import (
	"github.com/gin-gonic/gin"
)

// Response matches the standard response format required by the user
type Response struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data"`
	Message   string      `json:"message"`
	ErrorCode string      `json:"errorCode,omitempty"`
}

// JSON is a helper to send a standardized JSON response
func SendResponse(c *gin.Context, httpStatus int, success bool, data interface{}, message string, errorCode string) {
	c.JSON(httpStatus, Response{
		Success:   success,
		Data:      data,
		Message:   message,
		ErrorCode: errorCode,
	})
}

// Success is a shorthand for successful responses
func SendSuccess(c *gin.Context, httpStatus int, data interface{}, message string) {
	SendResponse(c, httpStatus, true, data, message, "")
}

// Error is a shorthand for error responses
func SendError(c *gin.Context, httpStatus int, message string, errorCode string) {
	SendResponse(c, httpStatus, false, nil, message, errorCode)
}
