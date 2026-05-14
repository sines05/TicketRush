package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"ticketrush/internal/dto"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
)

type AdminUserHandler struct {
	userRepo            repository.UserRepository
	notificationService service.NotificationService
}

func NewAdminUserHandler(userRepo repository.UserRepository, notificationService service.NotificationService) *AdminUserHandler {
	return &AdminUserHandler{userRepo: userRepo, notificationService: notificationService}
}

func (h *AdminUserHandler) ListUsers(c *gin.Context) {
	users, err := h.userRepo.FindAll()
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lỗi lấy danh sách người dùng", "FETCH_USERS_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToUserResponses(users), "Thành công")
}

type updateRoleRequest struct {
	Role models.UserRole `json:"role" binding:"required"`
}

func (h *AdminUserHandler) UpdateUserRole(c *gin.Context) {
	idStr := c.Param("id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID người dùng không hợp lệ", "INVALID_USER_ID")
		return
	}

	var req updateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT")
		return
	}

	if req.Role != models.RoleAdmin && req.Role != models.RoleCustomer {
		utils.SendError(c, http.StatusBadRequest, "Vai trò không hợp lệ", "INVALID_ROLE")
		return
	}

	if err := h.userRepo.UpdateRole(userID, req.Role); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lỗi cập nhật vai trò", "UPDATE_ROLE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Cập nhật vai trò thành công")
}

type updateMembershipRequest struct {
	MembershipTierID *uuid.UUID `json:"membership_tier_id"`
}

func (h *AdminUserHandler) UpdateUserMembership(c *gin.Context) {
	idStr := c.Param("id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID người dùng không hợp lệ", "INVALID_USER_ID")
		return
	}

	var req updateMembershipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT")
		return
	}

	if err := h.userRepo.UpdateMembership(userID, req.MembershipTierID); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lỗi cập nhật hạng thành viên", "UPDATE_MEMBERSHIP_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Cập nhật hạng thành viên thành công")
}

func (h *AdminUserHandler) DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID người dùng không hợp lệ", "INVALID_USER_ID")
		return
	}

	if err := h.userRepo.Delete(userID); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lỗi xóa người dùng", "DELETE_USER_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Xóa người dùng thành công")
}

func (h *AdminUserHandler) NotifyUser(c *gin.Context) {
	idStr := c.Param("id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID người dùng không hợp lệ", "INVALID_USER_ID")
		return
	}

	var req struct {
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT")
		return
	}

	user, err := h.userRepo.FindByID(userID)
	if err != nil || user == nil {
		utils.SendError(c, http.StatusNotFound, "Người dùng không tồn tại", "USER_NOT_FOUND")
		return
	}

	h.notificationService.SendSystemNotification(userID, "Thông báo từ quản trị viên", req.Message)

	utils.SendSuccess(c, http.StatusOK, nil, "Gửi thông báo thành công")
}
