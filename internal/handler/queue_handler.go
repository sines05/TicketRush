package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/queue"
	"ticketrush/internal/utils"
)

type QueueHandler struct {
	queueService queue.Service
}

func NewQueueHandler(queueService queue.Service) *QueueHandler {
	return &QueueHandler{queueService: queueService}
}

type joinRequest struct {
	EventID uuid.UUID `json:"event_id" binding:"required"`
}

func (h *QueueHandler) JoinQueue(c *gin.Context) {
	var req joinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	user, _ := c.Get("user")
	u := user.(*models.User)

	status, token, allowedAt, err := h.queueService.JoinQueue(c.Request.Context(), req.EventID, u.ID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "QUEUE_JOIN_FAILED")
		return
	}

	c.Header("X-Queue-Token", token)
	utils.SendSuccess(c, http.StatusOK, gin.H{
		"status":      status,
		"queue_token": token,
		"allowed_at":  allowedAt,
	}, "Thành công")
}

func (h *QueueHandler) GetStatus(c *gin.Context) {
	eventIDStr := c.Query("event_id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "invalid event_id", "INVALID_ID")
		return
	}

	user, _ := c.Get("user")
	u := user.(*models.User)

	status, pos, token, allowedAt, err := h.queueService.GetStatus(c.Request.Context(), eventID, u.ID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	c.Header("X-Queue-Token", token)
	utils.SendSuccess(c, http.StatusOK, gin.H{
		"status":      status,
		"position":    pos,
		"queue_token": token,
		"allowed_at":  allowedAt,
	}, "Thành công")
}
