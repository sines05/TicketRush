package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"ticketrush/internal/config"
	"ticketrush/internal/handler"
	"ticketrush/internal/models"
	"ticketrush/internal/service"
)

func TestSecurity_2FA_Logic(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	
	encryptionKey := "12345678901234567890123456789012" // 32 bytes
	jwtSecret := "test-jwt-secret"
	cfg := &config.Config{
		JWTSecret:           jwtSecret,
		EncryptionMasterKey: encryptionKey,
	}
	
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)
	authHandler := handler.NewAuthHandler(authServ, cfg)

	r := gin.New()
	r.POST("/auth/verify-2fa", authHandler.Verify2FALogin)

	t.Run("Pending Token Requirement", func(t *testing.T) {
		// Call with invalid token
		reqBody, _ := json.Marshal(map[string]string{
			"pending_token": "invalid-token",
			"code":          "123456",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/auth/verify-2fa", bytes.NewBuffer(reqBody))
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "TOKEN_EXPIRED")
	})

	t.Run("Intent Enforcement", func(t *testing.T) {
		userID := uuid.New()
		// Manually create a token with wrong intent
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": userID.String(),
			"intent":  "access",
			"exp":     time.Now().Add(time.Minute).Unix(),
		})
		tokenString, _ := token.SignedString([]byte(jwtSecret))

		reqBody, _ := json.Marshal(map[string]string{
			"pending_token": tokenString,
			"code":          "123456",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/auth/verify-2fa", bytes.NewBuffer(reqBody))
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "TOKEN_EXPIRED")
	})

	t.Run("Strict Decryption", func(t *testing.T) {
		userID := uuid.New()
		pendingToken, _ := authServ.Generate2FAPendingToken(userID)
		
		// Mock user with plaintext secret (not encrypted with AES)
		user := &models.User{
			BaseModel:         models.BaseModel{ID: userID},
			TwoFactorEnabled:  true,
			TwoFactorSecret:   "JBSWY3DPEHPK3PXP", // Plaintext TOTP secret
		}
		mockRepo.On("FindByID", userID).Return(user, nil)

		reqBody, _ := json.Marshal(map[string]string{
			"pending_token": pendingToken,
			"code":          "123456",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/auth/verify-2fa", bytes.NewBuffer(reqBody))
		r.ServeHTTP(w, req)

		// Should fail because decryption fails (it's not a valid base64-encoded AES ciphertext)
		// Or if it is valid base64, it will fail GCM decryption.
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "INVALID_CODE")
	})
}
