package handler

import (
	"net/http"
	"strings"

	"ticketrush/internal/service"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type EventHandler struct {
	eventService service.EventService
}

func NewEventHandler(eventService service.EventService) *EventHandler {
	return &EventHandler{eventService: eventService}
}

func (h *EventHandler) CreateEvent(c *gin.Context) {
	var req service.EventCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	if strings.TrimSpace(req.Category) == "" {
		utils.SendError(c, http.StatusBadRequest, "category is required", "INVALID_INPUT")
		return
	}

	event, err := h.eventService.CreateEvent(req)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "CREATE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusCreated, gin.H{
		"event_id": event.ID,
	}, "Đã tạo sự kiện và sinh thành công các ghế")
}

func (h *EventHandler) ListEvents(c *gin.Context) {
	events, err := h.eventService.ListEvents()
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	data := make([]map[string]interface{}, 0)
	for _, e := range events {
		data = append(data, map[string]interface{}{
			"id":          e.ID,
			"title":       e.Title,
			"banner_url":  e.BannerURL,
			"category":    e.Category,
			"start_time":  e.StartTime,
			"is_featured": e.IsFeatured,
		})
	}

	utils.SendSuccess(c, http.StatusOK, data, "Thành công")
}

func (h *EventHandler) ListFeaturedEvents(c *gin.Context) {
	events, err := h.eventService.ListFeaturedEvents(5)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	data := make([]map[string]interface{}, 0, len(events))
	for _, e := range events {
		data = append(data, map[string]interface{}{
			"id":          e.ID,
			"title":       e.Title,
			"description": e.Description,
			"banner_url":  e.BannerURL,
			"category":    e.Category,
			"start_time":  e.StartTime,
			"end_time":    e.EndTime,
			"is_featured": e.IsFeatured,
		})
	}

	utils.SendSuccess(c, http.StatusOK, data, "Thành công")
}

func (h *EventHandler) GetEvent(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "invalid event id", "INVALID_ID")
		return
	}

	event, err := h.eventService.GetEvent(id)
	if err != nil {
		utils.SendError(c, http.StatusNotFound, "event not found", "NOT_FOUND")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"id":           event.ID,
		"title":        event.Title,
		"description":  event.Description,
		"banner_url":   event.BannerURL,
		"category":     event.Category,
		"start_time":   event.StartTime,
		"end_time":     event.EndTime,
		"is_published": event.IsPublished,
		"is_featured":  event.IsFeatured,
	}, "Thành công")
}

func (h *EventHandler) ListAdminEvents(c *gin.Context) {
	events, err := h.eventService.ListAdminEvents()
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	data := make([]map[string]interface{}, 0)
	for _, e := range events {
		data = append(data, map[string]interface{}{
			"id":           e.ID,
			"title":        e.Title,
			"banner_url":   e.BannerURL,
			"category":     e.Category,
			"start_time":   e.StartTime,
			"end_time":     e.EndTime,
			"is_published": e.IsPublished,
			"is_featured":  e.IsFeatured,
		})
	}

	utils.SendSuccess(c, http.StatusOK, data, "Thành công")
}

func (h *EventHandler) UpdateEvent(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "invalid event id", "INVALID_ID")
		return
	}

	var req service.EventCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	_, err = h.eventService.UpdateEvent(id, req)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "UPDATE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{"event_id": id}, "Đã cập nhật sự kiện")
}

func (h *EventHandler) DeleteEvent(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "invalid event id", "INVALID_ID")
		return
	}

	if err := h.eventService.DeleteEvent(id); err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "DELETE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{"event_id": id}, "Đã xoá sự kiện")
}

func (h *EventHandler) GetSeatMap(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "invalid event id", "INVALID_ID")
		return
	}

	data, err := h.eventService.GetSeatMap(id)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, data, "Thành công")
}

func (h *EventHandler) GetStats(c *gin.Context) {
	var eventID *uuid.UUID
	eventIDStr := c.Query("event_id")
	if eventIDStr != "" {
		id, err := uuid.Parse(eventIDStr)
		if err == nil {
			eventID = &id
		}
	}

	stats, err := h.eventService.GetAdminStats(eventID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, stats, "Thành công")
}
