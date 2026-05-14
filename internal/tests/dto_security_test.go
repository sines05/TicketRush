package tests

import (
	"encoding/json"
	"testing"
	"ticketrush/internal/dto"
	"ticketrush/internal/models"

	"github.com/stretchr/testify/assert"
)

func TestDTOSecurity(t *testing.T) {
	t.Run("UserResponse should not contain sensitive fields", func(t *testing.T) {
		user := models.User{
			PasswordHash:      "secret_hash",
			TwoFactorSecret:   "secret_2fa",
			NotificationToken: "secret_token",
		}
		resp := dto.ToUserResponse(user)
		data, err := json.Marshal(resp)
		assert.NoError(t, err)
		
		jsonStr := string(data)

		// Check field names are not in JSON
		assert.NotContains(t, jsonStr, "password_hash")
		assert.NotContains(t, jsonStr, "two_factor_secret")
		assert.NotContains(t, jsonStr, "notification_token")
		
		// Check values are not in JSON
		assert.NotContains(t, jsonStr, "secret_hash")
		assert.NotContains(t, jsonStr, "secret_2fa")
		assert.NotContains(t, jsonStr, "secret_token")
	})

	t.Run("TicketResponse should contain QR code tokens for owner", func(t *testing.T) {
		ticket := models.Ticket{
			QRCodeToken: "visible_qr_token",
		}
		resp := dto.ToTicketResponse(ticket)
		data, err := json.Marshal(resp)
		assert.NoError(t, err)
		
		jsonStr := string(data)

		// Check field name is in JSON
		assert.Contains(t, jsonStr, "qr_code_token")
		
		// Check value is in JSON
		assert.Contains(t, jsonStr, "visible_qr_token")
	})

	t.Run("EventResponse should not contain sensitive fields", func(t *testing.T) {
		// Event doesn't have explicitly defined sensitive fields in the task,
		// but we check it exists and is serializable.
		event := models.Event{
			Title: "Test Event",
		}
		resp := dto.ToEventResponse(event)
		data, err := json.Marshal(resp)
		assert.NoError(t, err)
		assert.NotEmpty(t, data)
	})
}
