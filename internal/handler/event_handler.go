package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ticketrush/internal/dto"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
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

	_, err := h.eventService.CreateEvent(req)
	if err != nil {
		if errors.Is(err, service.ErrDuplicateZoneName) {
			utils.SendError(c, http.StatusBadRequest, "Tên zone bị trùng trong cùng một sự kiện", "DUPLICATE_ZONE_NAME")
			return
		}
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "CREATE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusCreated, nil, "Đã tạo sự kiện và sinh thành công các ghế")
}

func (h *EventHandler) ListEvents(c *gin.Context) {
	filter := repository.EventFilter{
		Search:   c.Query("q"),
		Location: c.Query("location"),
	}

	if catStr := c.Query("category"); catStr != "" {
		filter.Category = strings.Split(catStr, ",")
	}

	if dateFromStr := c.Query("date_from"); dateFromStr != "" {
		if t, err := time.Parse(time.RFC3339, dateFromStr); err == nil {
			filter.DateFrom = &t
		} else if t, err := time.Parse("2006-01-02", dateFromStr); err == nil {
			filter.DateFrom = &t
		}
	}
	if dateToStr := c.Query("date_to"); dateToStr != "" {
		if t, err := time.Parse(time.RFC3339, dateToStr); err == nil {
			filter.DateTo = &t
		} else if t, err := time.Parse("2006-01-02", dateToStr); err == nil {
			filter.DateTo = &t
		}
	}
	if minPriceStr := c.Query("min_price"); minPriceStr != "" {
		if p, err := strconv.ParseFloat(minPriceStr, 64); err == nil {
			filter.MinPrice = &p
		}
	}
	if maxPriceStr := c.Query("max_price"); maxPriceStr != "" {
		if p, err := strconv.ParseFloat(maxPriceStr, 64); err == nil {
			filter.MaxPrice = &p
		}
	}

	events, err := h.eventService.ListEvents(filter)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToEventSearchResponses(events), "Thành công")
}

func (h *EventHandler) ListFeaturedEvents(c *gin.Context) {
	limitStr := c.Query("limit")
	limit := 5
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	events, err := h.eventService.ListFeaturedEvents(limit)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToEventResponses(events), "Thành công")
}

func (h *EventHandler) ListHeroEvents(c *gin.Context) {
	limitStr := c.Query("limit")
	limit := 5
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	events, err := h.eventService.ListHeroEvents(limit)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToEventResponses(events), "Thành công")
}

func (h *EventHandler) GetEvent(c *gin.Context) {
	idOrSlug := c.Param("id")
	var event *models.Event
	var err error

	if id, parseErr := uuid.Parse(idOrSlug); parseErr == nil {
		event, err = h.eventService.GetEvent(id)
	} else {
		event, err = h.eventService.GetEventBySlug(idOrSlug)
	}

	if err != nil {
		utils.SendError(c, http.StatusNotFound, "event not found", "EVENT_NOT_FOUND")
		return
	}

	// Best-effort view tracking (7-day rolling window) for trending ranking.
	_ = h.eventService.TrackEventView(c.Request.Context(), event.ID)

	utils.SendSuccess(c, http.StatusOK, dto.ToEventResponse(*event), "Thành công")
}

func (h *EventHandler) ListTrendingEvents(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "5")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 5
	}

	data, err := h.eventService.ListTrendingEvents(c.Request.Context(), limit)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToTrendingEventResponses(data), "Thành công")
}

func (h *EventHandler) GetSeatMap(c *gin.Context) {
	idOrSlug := c.Param("id")
	var eventID uuid.UUID
	var err error

	if id, parseErr := uuid.Parse(idOrSlug); parseErr == nil {
		eventID = id
	} else {
		event, err := h.eventService.GetEventBySlug(idOrSlug)
		if err != nil {
			utils.SendError(c, http.StatusNotFound, "event not found", "EVENT_NOT_FOUND")
			return
		}
		eventID = event.ID
	}

	data, err := h.eventService.GetSeatMap(eventID)
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

	event, err := h.eventService.UpdateEvent(id, req)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "UPDATE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"id":    event.ID,
		"title": event.Title,
	}, "Cập nhật sự kiện thành công")
}

func (h *EventHandler) DeleteEvent(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "invalid event id", "INVALID_ID")
		return
	}

	err = h.eventService.DeleteEvent(id)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "DELETE_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Xóa sự kiện thành công")
}

func (h *EventHandler) GetSimilarEvents(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "invalid event id", "INVALID_ID")
		return
	}

	events, err := h.eventService.GetSimilarEvents(c.Request.Context(), id)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToEventResponses(events), "Thành công")
}
