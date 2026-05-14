package dto

import (
	"time"

	"github.com/google/uuid"
	"ticketrush/internal/models"
)

type UserResponse struct {
	ID               uuid.UUID               `json:"id"`
	UserID           uuid.UUID               `json:"user_id"`
	Email            string                  `json:"email"`
	FullName         string                  `json:"full_name"`
	AvatarURL        string                  `json:"avatar_url"`
	Role             models.UserRole         `json:"role"`
	Gender           models.GenderType       `json:"gender"`
	DateOfBirth      time.Time               `json:"date_of_birth"`
	MembershipTierID *uuid.UUID              `json:"membership_tier_id,omitempty"`
	MembershipTier   *MembershipTierResponse `json:"membership_tier,omitempty"`
	TwoFactorEnabled bool                    `json:"two_factor_enabled"`
	IsOAuth          bool                    `json:"is_oauth"`
	CreatedAt        time.Time               `json:"created_at"`
	UpdatedAt        time.Time               `json:"updated_at"`
}

type MembershipTierResponse struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	PriorityLevel int       `json:"priority_level"`
	Description   string    `json:"description"`
}

func ToUserResponse(user models.User) UserResponse {
	var membershipTier *MembershipTierResponse
	if user.MembershipTier != nil {
		membershipTier = &MembershipTierResponse{
			ID:            user.MembershipTier.ID,
			Name:          user.MembershipTier.Name,
			PriorityLevel: user.MembershipTier.PriorityLevel,
			Description:   user.MembershipTier.Description,
		}
	}

	return UserResponse{
		ID:               user.ID,
		UserID:           user.ID,
		Email:            user.Email,
		FullName:         user.FullName,
		AvatarURL:        user.AvatarURL,
		Role:             user.Role,
		Gender:           user.Gender,
		DateOfBirth:      user.DateOfBirth,
		MembershipTierID: user.MembershipTierID,
		MembershipTier:   membershipTier,
		TwoFactorEnabled: user.TwoFactorEnabled,
		IsOAuth:          user.IsOAuth,
		CreatedAt:        user.CreatedAt,
		UpdatedAt:        user.UpdatedAt,
	}
}

func ToUserResponses(users []models.User) []UserResponse {
	responses := make([]UserResponse, len(users))
	for i, user := range users {
		responses[i] = ToUserResponse(user)
	}
	return responses
}
