package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"ticketrush/internal/dto"
	"ticketrush/internal/models"
	"ticketrush/internal/queue"
	"ticketrush/internal/service"
	"ticketrush/internal/utils"
)

type OrderHandler struct {
	orderService service.OrderService
	queueService queue.Service
}

func NewOrderHandler(orderService service.OrderService, queueService queue.Service) *OrderHandler {
	return &OrderHandler{
		orderService: orderService,
		queueService: queueService,
	}
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

	// Verify X-Queue-Token (will be thoroughly verified in service if IsQueueMode is true)
	token := c.GetHeader("X-Queue-Token")

	order, err := h.orderService.LockSeats(c.Request.Context(), u.ID, req.EventID, req.SeatIDs, token)
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

	// Update session with Order ID so frontend can recover
	_ = h.queueService.UpdateSessionOrder(c.Request.Context(), token, order.ID, order.ExpiresAt)

	utils.SendSuccess(c, http.StatusOK, dto.ToOrderResponse(*order), "Thành công")
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

	utils.SendSuccess(c, http.StatusOK, dto.ToOrderResponse(*order), "Thanh toán thành công! Vé đã được tạo.")
}

type cancelOrderRequest struct {
	OrderID uuid.UUID `json:"order_id" binding:"required"`
}

func (h *OrderHandler) CancelOrder(c *gin.Context) {
	var req cancelOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	user, _ := c.Get("user")
	u := user.(*models.User)

	err := h.orderService.CancelOrder(c.Request.Context(), u.ID, req.OrderID)
	if err != nil {
		if errors.Is(err, utils.ErrOrderNotFound) {
			utils.SendError(c, http.StatusNotFound, err.Error(), "ORDER_NOT_FOUND")
		} else if errors.Is(err, utils.ErrOrderNotPending) {
			utils.SendError(c, http.StatusBadRequest, err.Error(), "ORDER_NOT_PENDING")
		} else {
			utils.SendError(c, http.StatusInternalServerError, err.Error(), "CANCEL_FAILED")
		}
		return
	}

	utils.SendSuccess(c, http.StatusOK, nil, "Đã hủy đơn hàng và giải phóng ghế.")
}

type checkInTicketRequest struct {
	QRCodeToken string `json:"qr_code_token" binding:"required"`
}

func (h *OrderHandler) GetMyTickets(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*models.User)

	tickets, err := h.orderService.GetMyTickets(u.ID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToTicketResponses(tickets), "Thành công")
}

func (h *OrderHandler) GetTickets(c *gin.Context) {
	eventIDParam := c.Query("event_id")
	var eventID *uuid.UUID
	if eventIDParam != "" {
		parsed, err := uuid.Parse(eventIDParam)
		if err != nil {
			utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_EVENT_ID")
			return
		}
		eventID = &parsed
	}

	tickets, err := h.orderService.GetTickets(eventID)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "FETCH_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToTicketResponses(tickets), "Thành công")
}

func (h *OrderHandler) CheckInTicket(c *gin.Context) {
	var req checkInTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, err.Error(), "INVALID_INPUT")
		return
	}

	ticket, err := h.orderService.CheckInTicket(c.Request.Context(), req.QRCodeToken)
	if err != nil {
		if errors.Is(err, utils.ErrTicketNotFound) {
			utils.SendError(c, http.StatusNotFound, err.Error(), "TICKET_NOT_FOUND")
			return
		}
		if errors.Is(err, utils.ErrTicketAlreadyCheckedIn) {
			utils.SendError(c, http.StatusConflict, err.Error(), "TICKET_ALREADY_CHECKED_IN")
			return
		}
		utils.SendError(c, http.StatusInternalServerError, err.Error(), "CHECKIN_FAILED")
		return
	}

	utils.SendSuccess(c, http.StatusOK, dto.ToTicketResponse(*ticket), "Vé đã được xác nhận.")
}
