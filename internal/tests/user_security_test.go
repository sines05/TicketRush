package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
	"ticketrush/internal/config"
	"ticketrush/internal/middleware"
	"ticketrush/internal/models"
	"ticketrush/internal/service"
	"ticketrush/internal/utils/encryption"
)

// MockUserRepository is a mock of UserRepository
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(user *models.User) error {
	args := m.Called(user)
	return args.Error(0)
}

func (m *MockUserRepository) FindByEmail(email string) (*models.User, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) FindByID(id uuid.UUID) (*models.User, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) Update(user *models.User) error {
	args := m.Called(user)
	return args.Error(0)
}

func (m *MockUserRepository) UpdatePassword(userID uuid.UUID, newPasswordHash string) error {
	args := m.Called(userID, newPasswordHash)
	return args.Error(0)
}

func (m *MockUserRepository) CreatePasswordReset(reset *models.PasswordReset) error {
	args := m.Called(reset)
	return args.Error(0)
}

func (m *MockUserRepository) FindPasswordResetByToken(token string) (*models.PasswordReset, error) {
	args := m.Called(token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PasswordReset), args.Error(1)
}

func (m *MockUserRepository) DeletePasswordReset(token string) error {
	args := m.Called(token)
	return args.Error(0)
}

func (m *MockUserRepository) Update2FA(userID uuid.UUID, enabled bool, secret string, recoveryCodes string) error {
	args := m.Called(userID, enabled, secret, recoveryCodes)
	return args.Error(0)
}

func (m *MockUserRepository) Update2FAPending(userID uuid.UUID, pendingSecret string, recoveryCodes string) error {
	args := m.Called(userID, pendingSecret, recoveryCodes)
	return args.Error(0)
}

func (m *MockUserRepository) UpdateNotificationToken(userID uuid.UUID, token string) error {
	args := m.Called(userID, token)
	return args.Error(0)
}

func (m *MockUserRepository) FindAll() ([]models.User, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.User), args.Error(1)
}

func (m *MockUserRepository) UpdateRole(userID uuid.UUID, role models.UserRole) error {
	args := m.Called(userID, role)
	return args.Error(0)
}

func (m *MockUserRepository) UpdateMembership(userID uuid.UUID, tierID *uuid.UUID) error {
	args := m.Called(userID, tierID)
	return args.Error(0)
}

func (m *MockUserRepository) Delete(userID uuid.UUID) error {
	args := m.Called(userID)
	return args.Error(0)
}

// MockNotificationService is a mock of NotificationService
type MockNotificationService struct {
	mock.Mock
}

func (m *MockNotificationService) NotifyTicketPurchased(user *models.User, tickets []models.Ticket, event *models.Event) {
	m.Called(user, tickets, event)
}

func (m *MockNotificationService) NotifyWelcome(user *models.User) {
	m.Called(user)
}

func (m *MockNotificationService) NotifyOrderConfirmation(user *models.User, order *models.Order) {
	m.Called(user, order)
}

func (m *MockNotificationService) NotifySecurityEvent(user *models.User, eventName string) {
	m.Called(user, eventName)
}

func (m *MockNotificationService) SendSystemNotification(userID uuid.UUID, title, message string) {
	m.Called(userID, title, message)
}

func (m *MockNotificationService) StartWorker() {
	m.Called()
}

func TestUpdateProfile_Success(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()
	dobStr := "1990-01-01"
	parsedDOB, _ := time.Parse("2006-01-02", dobStr)

	existingUser := &models.User{
		BaseModel: models.BaseModel{ID: userID},
		FullName:  "Old Name",
		Email:     "test@example.com",
	}

	mockRepo.On("FindByID", userID).Return(existingUser, nil)
	mockRepo.On("Update", mock.AnythingOfType("*models.User")).Return(nil)

	updatedUser, err := authServ.UpdateProfile(userID, "New Name", "http://avatar.com", models.GenderMale, dobStr)

	assert.NoError(t, err)
	assert.Equal(t, "New Name", updatedUser.FullName)
	assert.Equal(t, "http://avatar.com", updatedUser.AvatarURL)
	assert.Equal(t, models.GenderMale, updatedUser.Gender)
	assert.Equal(t, parsedDOB, updatedUser.DateOfBirth)
	mockRepo.AssertExpectations(t)
}

func TestUpdateProfile_InvalidDOB(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()
	dobStr := "invalid-date"

	existingUser := &models.User{
		BaseModel: models.BaseModel{ID: userID},
	}

	mockRepo.On("FindByID", userID).Return(existingUser, nil)

	_, err := authServ.UpdateProfile(userID, "New Name", "http://avatar.com", models.GenderMale, dobStr)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid date_of_birth format")
}

func TestChangePassword_Success(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()
	oldPassword := "oldPassword1"
	newPassword := "newPassword1"
	hashedOldPassword, _ := bcrypt.GenerateFromPassword([]byte(oldPassword), bcrypt.DefaultCost)

	existingUser := &models.User{
		BaseModel:    models.BaseModel{ID: userID},
		PasswordHash: string(hashedOldPassword),
	}

	mockRepo.On("FindByID", userID).Return(existingUser, nil)
	mockRepo.On("UpdatePassword", userID, mock.AnythingOfType("string")).Return(nil)

	err := authServ.ChangePassword(userID, oldPassword, newPassword)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestChangePassword_IncorrectOldPassword(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()
	oldPassword := "oldPassword1"
	wrongPassword := "wrongPassword1"
	newPassword := "newPassword1"
	hashedOldPassword, _ := bcrypt.GenerateFromPassword([]byte(oldPassword), bcrypt.DefaultCost)

	existingUser := &models.User{
		BaseModel:    models.BaseModel{ID: userID},
		PasswordHash: string(hashedOldPassword),
	}

	mockRepo.On("FindByID", userID).Return(existingUser, nil)

	err := authServ.ChangePassword(userID, wrongPassword, newPassword)

	assert.Error(t, err)
	assert.Equal(t, "invalid old password", err.Error())
	mockRepo.AssertNotCalled(t, "UpdatePassword", mock.Anything, mock.Anything)
}

func TestChangePassword_OAuthAccount(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()

	existingUser := &models.User{
		BaseModel:    models.BaseModel{ID: userID},
		IsOAuth:      true,
		PasswordHash: "",
	}

	mockRepo.On("FindByID", userID).Return(existingUser, nil)

	err := authServ.ChangePassword(userID, "anyPassword1", "newPassword1")

	assert.Error(t, err)
	assert.Equal(t, "cannot change password for OAuth account without password", err.Error())
}

func TestDisable2FA_Success(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()
	secret := "JBSWY3DPEHPK3PXP" // Example secret
	code, _ := totp.GenerateCode(secret, time.Now().UTC())

	existingUser := &models.User{
		BaseModel:        models.BaseModel{ID: userID},
		TwoFactorEnabled: true,
		TwoFactorSecret:  secret,
	}

	mockRepo.On("FindByID", userID).Return(existingUser, nil)
	mockRepo.On("Update2FA", userID, false, "", "").Return(nil)
	mockNotif.On("NotifySecurityEvent", existingUser, "Two-Factor Authentication Disabled").Return()

	err := authServ.Disable2FA(userID, code)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
	mockNotif.AssertExpectations(t)
}

func TestDisable2FA_InvalidCode(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()
	secret := "JBSWY3DPEHPK3PXP"
	invalidCode := "000000"

	existingUser := &models.User{
		BaseModel:        models.BaseModel{ID: userID},
		TwoFactorEnabled: true,
		TwoFactorSecret:  secret,
	}

	mockRepo.On("FindByID", userID).Return(existingUser, nil)

	err := authServ.Disable2FA(userID, invalidCode)

	assert.Error(t, err)
	assert.Equal(t, "invalid verification code", err.Error())
	mockRepo.AssertNotCalled(t, "Update2FA", mock.Anything, mock.Anything, mock.Anything)
	mockNotif.AssertNotCalled(t, "NotifySecurityEvent", mock.Anything, mock.Anything)
}

func TestDisable2FA_AlreadyDisabled(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()

	existingUser := &models.User{
		BaseModel:        models.BaseModel{ID: userID},
		TwoFactorEnabled: false,
	}

	mockRepo.On("FindByID", userID).Return(existingUser, nil)

	err := authServ.Disable2FA(userID, "123456")

	assert.Error(t, err)
	assert.Equal(t, "2FA is not enabled", err.Error())
	mockRepo.AssertNotCalled(t, "Update2FA", mock.Anything, mock.Anything, mock.Anything)
}

func TestTwoFactor_Generate(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret", EncryptionMasterKey: "12345678901234567890123456789012"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()
	user := &models.User{
		BaseModel: models.BaseModel{ID: userID},
		Email:     "test@example.com",
	}

	mockRepo.On("FindByID", userID).Return(user, nil)
	mockRepo.On("Update2FAPending", userID, mock.AnythingOfType("string"), mock.AnythingOfType("string")).Return(nil)

	secret, qrURL, codes, err := authServ.Generate2FA(userID)

	assert.NoError(t, err)
	assert.NotEmpty(t, secret)
	assert.NotEmpty(t, qrURL)
	assert.Len(t, codes, 10)
	mockRepo.AssertExpectations(t)
}

func TestTwoFactor_Enable(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret", EncryptionMasterKey: "12345678901234567890123456789012"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()
	secret := "JBSWY3DPEHPK3PXP"
	encryptedSecret, _ := encryption.EncryptAES(secret, []byte(cfg.EncryptionMasterKey))
	code, _ := totp.GenerateCode(secret, time.Now().UTC())

	user := &models.User{
		BaseModel:              models.BaseModel{ID: userID},
		PendingTwoFactorSecret: encryptedSecret,
		RecoveryCodes:          "[]",
	}

	mockRepo.On("FindByID", userID).Return(user, nil)
	mockRepo.On("Update2FA", userID, true, encryptedSecret, "[]").Return(nil)

	err := authServ.Enable2FA(userID, code)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestTwoFactor_Verify_TOTP(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret", EncryptionMasterKey: "12345678901234567890123456789012"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()
	secret := "JBSWY3DPEHPK3PXP"
	encryptedSecret, _ := encryption.EncryptAES(secret, []byte(cfg.EncryptionMasterKey))
	code, _ := totp.GenerateCode(secret, time.Now().UTC())

	user := &models.User{
		BaseModel:        models.BaseModel{ID: userID},
		TwoFactorEnabled: true,
		TwoFactorSecret:  encryptedSecret,
		Role:             models.RoleCustomer,
	}

	mockRepo.On("FindByID", userID).Return(user, nil)

	token, _, err := authServ.Verify2FA(userID, code)

	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate token
	u, verified, err := authServ.ValidateToken(token)
	assert.NoError(t, err)
	assert.True(t, verified)
	assert.Equal(t, userID, u.ID)
}

func TestTwoFactor_Verify_Recovery(t *testing.T) {
	mockRepo := new(MockUserRepository)
	mockNotif := new(MockNotificationService)
	cfg := &config.Config{JWTSecret: "secret", EncryptionMasterKey: "12345678901234567890123456789012"}
	authServ := service.NewAuthService(mockRepo, mockNotif, nil, cfg)

	userID := uuid.New()
	recoveryCode := "ABCDEFGH"
	hashedCode, _ := bcrypt.GenerateFromPassword([]byte(recoveryCode), bcrypt.DefaultCost)
	codesJSON, _ := json.Marshal([]string{string(hashedCode)})

	user := &models.User{
		BaseModel:        models.BaseModel{ID: userID},
		TwoFactorEnabled: true,
		RecoveryCodes:    string(codesJSON),
		Role:             models.RoleCustomer,
	}

	mockRepo.On("FindByID", userID).Return(user, nil)
	mockRepo.On("Update2FA", userID, true, "", "[]").Return(nil)

	token, _, err := authServ.Verify2FA(userID, recoveryCode)

	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate token
	u, verified, err := authServ.ValidateToken(token)
	assert.NoError(t, err)
	assert.True(t, verified)
	assert.Equal(t, userID, u.ID)
}

func TestTwoFactorMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("2FA Enabled and Verified", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		user := &models.User{TwoFactorEnabled: true}
		c.Set("user", user)
		c.Set("2fa_verified", true)

		middleware.TwoFactorMiddleware()(c)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.False(t, c.IsAborted())
	})

	t.Run("2FA Enabled and NOT Verified", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		user := &models.User{TwoFactorEnabled: true}
		c.Set("user", user)
		c.Set("2fa_verified", false)

		middleware.TwoFactorMiddleware()(c)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.True(t, c.IsAborted())
	})

	t.Run("2FA Disabled", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		user := &models.User{TwoFactorEnabled: false}
		c.Set("user", user)

		middleware.TwoFactorMiddleware()(c)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.False(t, c.IsAborted())
	})
}
