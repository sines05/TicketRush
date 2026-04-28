package handler

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"ticketrush/internal/models"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
)

type OrderHandler struct {
	orderService service.OrderService
}

func NewOrderHandler(orderService service.OrderService) *OrderHandler {
	return &OrderHandler{orderService: orderService}
}

type lockSeatsRequest struct {
	EventID uuid.UUID   `json:"event_id" binding:"required"`
	SeatIDs []uuid.UUID `json:"seat_ids" binding:"required,min=1"`
}

func (h *OrderHandler) LockSeats(c *gin.Context) {
	var req lockSeatsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	user, _ := c.Get("user")
	u := user.(*models.User)

	order, err := h.orderService.LockSeats(c.Request.Context(), u.ID, req.EventID, req.SeatIDs)
	if err != nil {
		if errors.Is(err, utils.ErrQueueNotAllowed) {
			utils.SendError(c, http.StatusForbidden, err.Error(), "QUEUE_NOT_ALLOWED")
		} else if errors.Is(err, utils.ErrSeatAlreadyTaken) {
			utils.SendError(c, http.StatusConflict, err.Error(), "SEAT_ALREADY_TAKEN")
		} else {
			utils.SendError(c, http.StatusInternalServerError, err.Error(), "LOCK_FAILED")
		}
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"order_id":     order.ID,
		"total_amount": order.TotalAmount,
		"status":       order.Status,
		"expires_at":   order.ExpiresAt,
	}, "Thành công")
}

type checkoutRequest struct {
	OrderID uuid.UUID `json:"order_id" binding:"required"`
}

func (h *OrderHandler) Checkout(c *gin.Context) {
	var req checkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	user, _ := c.Get("user")
	u := user.(*models.User)

	order, err := h.orderService.Checkout(c.Request.Context(), u.ID, req.OrderID)
	if err != nil {
		if errors.Is(err, utils.ErrOrderExpired) {
			utils.SendError(c, http.StatusBadRequest, err.Error(), "ORDER_EXPIRED")
		} else if errors.Is(err, utils.ErrOrderNotPending) {
			utils.SendError(c, http.StatusBadRequest, err.Error(), "ORDER_NOT_PENDING")
		} else {
			utils.SendError(c, http.StatusBadRequest, err.Error(), "CHECKOUT_FAILED")
		}
		return
	}

	utils.SendSuccess(c, http.StatusOK, gin.H{
		"order_id":     order.ID,
		"status":       order.Status,
		"ticket_count": len(order.OrderItems),
	}, "Thanh toán thành công! Vé đã được tạo.")
}

func (h *OrderHandler) GetMyTickets(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	tickets, err := h.orderService.GetMyTickets(u.ID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	data := make([]map[string]interface{}, 0)
	for _, t := range tickets {
		data = append(data, map[string]interface{}{
			"ticket_id":     t.ID,
			"event_title":   t.Seat.Zone.Event.Title,
			"zone_name":     t.Seat.Zone.Name,
			"seat_label":    fmt.Sprintf("%s-%d", t.Seat.RowLabel, t.Seat.SeatNumber),
			"qr_code_token": t.QRCodeToken,
			"is_checked_in": t.IsCheckedIn,
		})
	}

	utils.SendSuccess(c, http.StatusOK, data, "Thành công")
}
