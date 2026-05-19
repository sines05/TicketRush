package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"ticketrush/internal/dto"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
)

type NotificationHandler struct {
	notifRepo   repository.NotificationRepository
	notifSvc    service.NotificationService
	userRepo    repository.UserRepository
}

func NewNotificationHandler(notifRepo repository.NotificationRepository, notifSvc service.NotificationService, userRepo repository.UserRepository) *NotificationHandler {
	return &NotificationHandler{
		notifRepo: notifRepo,
		notifSvc:  notifSvc,
		userRepo:  userRepo,
	}
}

// GetMyNotifications returns paginated notifications for the current user
func (h *NotificationHandler) GetMyNotifications(c *gin.Context) {
	userObj, _ := c.Get("user")
	u := userObj.(*models.User)
	uid := u.ID

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	notifications, err := h.notifRepo.FindByUserID(uid, limit, offset)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lỗi lấy danh sách thông báo", "FETCH_NOTIFICATIONS_FAILED")
		return
	}

	count, _ := h.notifRepo.CountUnreadByUserID(uid)

	result := dto.NotificationListResponse{
		Notifications: dto.ToNotificationResponses(notifications),
		Total:         count,
		Page:          page,
		Limit:         limit,
	}

	utils.SendSuccess(c, http.StatusOK, result, "Thành công")
}

// GetUnreadCount returns the number of unread notifications for the current user
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	userObj, _ := c.Get("user")
	u := userObj.(*models.User)
	uid := u.ID

	count, err := h.notifRepo.CountUnreadByUserID(uid)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lỗi đếm thông báo", "COUNT_NOTIFICATIONS_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.UnreadCountResponse{Count: count}, "Thành công")
}

// MarkAsRead marks a single notification as read
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	userObj, _ := c.Get("user")
	u := userObj.(*models.User)
	uid := u.ID

	notifID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID thông báo không hợp lệ", "INVALID_NOTIFICATION_ID")
		return
	}

	if err := h.notifRepo.MarkAsRead(notifID, uid); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lỗi cập nhật thông báo", "MARK_READ_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Đã đánh dấu đã đọc")
}

// MarkAllAsRead marks all notifications as read for the current user
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userObj, _ := c.Get("user")
	u := userObj.(*models.User)
	uid := u.ID

	if err := h.notifRepo.MarkAllAsRead(uid); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lỗi cập nhật thông báo", "MARK_ALL_READ_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Đã đánh dấu tất cả đã đọc")
}

// DeleteNotification deletes a notification
func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	userObj, _ := c.Get("user")
	u := userObj.(*models.User)
	uid := u.ID

	notifID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID thông báo không hợp lệ", "INVALID_NOTIFICATION_ID")
		return
	}

	if err := h.notifRepo.Delete(notifID, uid); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lỗi xóa thông báo", "DELETE_NOTIFICATION_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Đã xóa thông báo")
}

type adminSendNotificationRequest struct {
	UserIDs []string `json:"user_ids"`
	Title   string   `json:"title" binding:"required"`
	Message string   `json:"message" binding:"required"`
	Type    string   `json:"type"`
}

// AdminSendNotification sends notification to specific users or broadcasts to all
func (h *NotificationHandler) AdminSendNotification(c *gin.Context) {
	var req adminSendNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Dữ liệu không hợp lệ", "INVALID_INPUT")
		return
	}

	notifType := models.NotifTypeAdmin
	if req.Type != "" {
		notifType = models.NotifType(req.Type)
	}

	if len(req.UserIDs) == 0 {
		// Broadcast to all users
		h.notifSvc.SendBroadcastNotification(req.Title, req.Message, notifType)
	} else {
		var userIDs []uuid.UUID
		for _, idStr := range req.UserIDs {
			uid, err := uuid.Parse(idStr)
			if err != nil {
				continue
			}
			userIDs = append(userIDs, uid)
		}
		if len(userIDs) == 0 {
			utils.SendError(c, http.StatusBadRequest, "Không có user_id hợp lệ", "INVALID_USER_IDS")
			return
		}
		h.notifSvc.SendAdminNotification(req.Title, req.Message, userIDs, notifType)
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Gửi thông báo thành công")
}

// AdminGetNotifications returns all notifications for admin view
func (h *NotificationHandler) AdminGetNotifications(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	notifications, err := h.notifRepo.FindAll(limit, offset)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lỗi lấy danh sách thông báo", "FETCH_NOTIFICATIONS_FAILED")
		return
	}

	total, _ := h.notifRepo.CountAll()

	result := dto.NotificationListResponse{
		Notifications: dto.ToNotificationResponses(notifications),
		Total:         total,
		Page:          page,
		Limit:         limit,
	}

	utils.SendSuccess(c, http.StatusOK, result, "Thành công")
}
