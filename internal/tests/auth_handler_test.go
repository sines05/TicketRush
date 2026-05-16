package tests

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"ticketrush/internal/config"
	"ticketrush/internal/handler"
)

func TestAuthHandler_Refresh_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockService := new(MockAuthService)
	cfg := &config.Config{CookieSecure: false}
	h := handler.NewAuthHandler(mockService, cfg)

	r := gin.Default()
	r.POST("/refresh", h.Refresh)

	oldRefreshToken := "old-rt"
	newAccessToken := "new-at"
	newRefreshToken := "new-rt"

	mockService.On("RefreshToken", oldRefreshToken).Return(newAccessToken, newRefreshToken, nil)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "tr_refresh_token", Value: oldRefreshToken})
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	
	// Check cookies
	cookies := w.Result().Cookies()
	var atFound, rtFound bool
	for _, c := range cookies {
		if c.Name == "tr_access_token" && c.Value == newAccessToken {
			atFound = true
		}
		if c.Name == "tr_refresh_token" && c.Value == newRefreshToken {
			rtFound = true
		}
	}
	assert.True(t, atFound)
	assert.True(t, rtFound)
	mockService.AssertExpectations(t)
}

func TestAuthHandler_Refresh_MissingCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockService := new(MockAuthService)
	cfg := &config.Config{}
	h := handler.NewAuthHandler(mockService, cfg)

	r := gin.Default()
	r.POST("/refresh", h.Refresh)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/refresh", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Refresh token missing")
}

func TestAuthHandler_Refresh_ServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockService := new(MockAuthService)
	cfg := &config.Config{}
	h := handler.NewAuthHandler(mockService, cfg)

	r := gin.Default()
	r.POST("/refresh", h.Refresh)

	oldRefreshToken := "invalid-rt"
	mockService.On("RefreshToken", oldRefreshToken).Return("", "", errors.New("invalid or expired refresh token"))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/refresh", nil)
	req.AddCookie(&http.Cookie{Name: "tr_refresh_token", Value: oldRefreshToken})
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "invalid or expired refresh token")
}

func TestAuthHandler_Logout(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockService := new(MockAuthService)
	cfg := &config.Config{CookieSecure: false}
	h := handler.NewAuthHandler(mockService, cfg)

	r := gin.Default()
	r.POST("/logout", h.Logout)

	refreshToken := "some-rt"
	mockService.On("Logout", refreshToken).Return(nil)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/logout", nil)
	req.AddCookie(&http.Cookie{Name: "tr_refresh_token", Value: refreshToken})
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	
	// Check cookies are cleared
	cookies := w.Result().Cookies()
	for _, c := range cookies {
		if c.Name == "tr_access_token" || c.Name == "tr_refresh_token" {
			assert.Equal(t, -1, c.MaxAge)
		}
	}
	mockService.AssertExpectations(t)
}
