package handler

import (
	"net/http"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AdminDashboardHandler struct {
	orderRepo repository.OrderRepository
	eventRepo repository.EventRepository
}

func NewAdminDashboardHandler(orderRepo repository.OrderRepository, eventRepo repository.EventRepository) *AdminDashboardHandler {
	return &AdminDashboardHandler{
		orderRepo: orderRepo,
		eventRepo: eventRepo,
	}
}

func (h *AdminDashboardHandler) GetStats(c *gin.Context) {
	var eventID *uuid.UUID
	eventIDStr := c.Query("event_id")
	if eventIDStr != "" {
		id, err := uuid.Parse(eventIDStr)
		if err == nil {
			eventID = &id
		}
	}

	revenue, sold, err := h.orderRepo.GetRevenueStats(c.Request.Context(), eventID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Failed to fetch stats", "INTERNAL_ERROR")
		return
	}

	// Calculate occupancy rate if eventID is provided
	var occupancyRate float64
	if eventID != nil {
		totalSeats, err := h.eventRepo.GetTotalSeats(c.Request.Context(), *eventID)
		if err == nil && totalSeats > 0 {
			occupancyRate = float64(sold) / float64(totalSeats)
		}
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"total_revenue":  revenue,
		"total_sold":     sold,
		"occupancy_rate": occupancyRate,
	}, "Dashboard stats fetched successfully")
}
