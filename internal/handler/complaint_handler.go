package handler

import (
	"net/http"
	"ticketrush/internal/dto"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ComplaintHandler struct {
	complaintRepo repository.ComplaintRepository
}

func NewComplaintHandler(complaintRepo repository.ComplaintRepository) *ComplaintHandler {
	return &ComplaintHandler{complaintRepo: complaintRepo}
}

func (h *ComplaintHandler) CreateComplaint(c *gin.Context) {
	userObj, exists := c.Get("user")
	if !exists {
		utils.SendError(c, http.StatusUnauthorized, "User not authenticated", "AUTH_REQUIRED")
		return
	}
	u := userObj.(*models.User)
	userID := u.ID

	var input struct {
		Title   string `json:"title" binding:"required"`
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Invalid input", "INVALID_INPUT")
		return
	}

	if err := h.complaintRepo.CreateComplaint(c.Request.Context(), &models.Complaint{
		UserID:  userID,
		Title:   input.Title,
		Content: input.Content,
		Status:  models.ComplaintPending,
	}); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to submit complaint", "INTERNAL_ERROR")
		return
	}

	utils.SendSuccess(c, http.StatusCreated, nil, "Complaint submitted successfully")
}

func (h *ComplaintHandler) GetMyComplaints(c *gin.Context) {
	userObj, exists := c.Get("user")
	if !exists {
		utils.SendError(c, http.StatusUnauthorized, "User not authenticated", "AUTH_REQUIRED")
		return
	}
	u := userObj.(*models.User)
	userID := u.ID

	complaints, err := h.complaintRepo.GetComplaintsByUserID(c.Request.Context(), userID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to fetch complaints", "INTERNAL_ERROR")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToComplaintResponses(complaints), "Complaints fetched successfully")
}

func (h *ComplaintHandler) AdminGetAllComplaints(c *gin.Context) {
	complaints, err := h.complaintRepo.GetAllComplaints(c.Request.Context())
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to fetch complaints", "INTERNAL_ERROR")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToComplaintResponses(complaints), "All complaints fetched successfully")
}

func (h *ComplaintHandler) AdminUpdateComplaintStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "Invalid complaint ID", "INVALID_ID")
		return
	}

	var input struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Invalid input", "INVALID_INPUT")
		return
	}

	newStatus := models.ComplaintStatus(input.Status)
	if newStatus != models.ComplaintPending && newStatus != models.ComplaintResolved && newStatus != models.ComplaintRejected {
		utils.SendError(c, http.StatusBadRequest, "Invalid status", "INVALID_STATUS")
		return
	}

	if err := h.complaintRepo.UpdateComplaintStatus(c.Request.Context(), id, newStatus); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to update complaint status", "INTERNAL_ERROR")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Complaint status updated successfully")
}
