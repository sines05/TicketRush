---
title: "Profile and Password Security Implementation Plan"
created: "2026-05-09T00:00:00Z"
status: "approved"
total_phases: 4
estimated_files: 6
task_complexity: "medium"
---

# Profile and Password Security Implementation Plan

## Plan Overview
- **Total phases**: 4
- **Agents involved**: coder, tester
- **Estimated effort**: Implement missing profile update and secure password change logic across all backend layers.

## Phase 1: Model and Repository Updates
### Objective
Update the User model to include `avatar_url` and implement a general update method in the repository.
### Agent: coder
### Parallel: No
### Files to Modify
- `internal/models/user.go`: Add `AvatarURL string \`gorm:\"type:varchar(255)\" json:\"avatar_url\"\`` to the `User` struct.
- `internal/repository/user_repository.go`: Add `Update(user *models.User) error` to `UserRepository` interface and implement it in `userRepo`.
### Validation
- `go build ./internal/models/... && go build ./internal/repository/...`
### Dependencies
- Blocks: Phase 2

## Phase 2: Service Layer Implementation
### Objective
Implement business logic for profile updates and secure password changes in the AuthService.
### Agent: coder
### Parallel: No
### Files to Modify
- `internal/service/auth_service.go`: 
    - Add `UpdateProfile(userID uuid.UUID, fullName string, avatarURL string, gender models.GenderType, dob string) (*models.User, error)` to `AuthService`.
    - Add `ChangePassword(userID uuid.UUID, oldPassword string, newPassword string) error` to `AuthService`.
    - Implement both methods with proper validation (e.g., `bcrypt` check for old password).
### Validation
- `go build ./internal/service/...`
### Dependencies
- Blocked by: Phase 1
- Blocks: Phase 3

## Phase 3: Handler and Route Registration
### Objective
Expose the new functionality via API endpoints and register routes.
### Agent: coder
### Parallel: No
### Files to Modify
- `internal/handler/auth_handler.go`: Implement `UpdateMe` and `ChangePassword` handlers.
- `cmd/server/main.go`: Register `PATCH /users/me` and `POST /users/change-password` routes under the protected group.
### Validation
- `go build ./cmd/server/...`
### Dependencies
- Blocked by: Phase 2
- Blocks: Phase 4

## Phase 4: Verification and Testing
### Objective
Verify the new endpoints work as expected.
### Agent: tester
### Parallel: No
### Files to Create
- `internal/tests/user_security_test.go`: Add tests for profile update and password change (success and failure cases).
### Validation
- `go test ./internal/tests/user_security_test.go`
### Dependencies
- Blocked by: Phase 3
