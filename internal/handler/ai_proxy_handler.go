package handler

import (
	"net/http"
	"ticketrush/internal/models"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
)

type AIProxyHandler struct {
	aiProxyService service.AIProxyService
}

func NewAIProxyHandler(aiProxyService service.AIProxyService) *AIProxyHandler {
	return &AIProxyHandler{
		aiProxyService: aiProxyService,
	}
}

type ChatRequest struct {
	Message  string `json:"message" binding:"required"`
	ThreadID string `json:"thread_id"`
}

func (h *AIProxyHandler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Invalid request body", "INVALID_REQUEST")
		return
	}

	var userID string
	if user, exists := c.Get("user"); exists {
		if u, ok := user.(*models.User); ok {
			userID = u.ID.String()
		}
	}

	reply, threadID, uiComponents, err := h.aiProxyService.Chat(req.Message, userID, req.ThreadID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to communicate with AI agent", "AI_AGENT_ERROR")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"reply":         reply,
		"thread_id":     threadID,
		"ui_components": uiComponents,
	}, "Chat successful")
}
