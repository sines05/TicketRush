package service

import (
	"fmt"
	"log"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"

	"github.com/google/uuid"
)

type NotificationType string

const (
	NotificationEmailTicket NotificationType = "EMAIL_TICKET"
	NotificationPushTicket  NotificationType = "PUSH_TICKET"
	NotificationWelcome     NotificationType = "WELCOME"
	NotificationOrderConf   NotificationType = "ORDER_CONFIRMATION"
	NotificationSystem      NotificationType = "SYSTEM_MESSAGE"
	NotificationSecurity    NotificationType = "SECURITY_EVENT"
)

type NotificationTask struct {
	Type    NotificationType
	UserID  string
	Payload map[string]interface{}
}

// Broadcaster is an interface for sending real-time messages via WebSocket
type NotificationBroadcaster interface {
	Broadcast(channel string, data interface{})
}

type NotificationService interface {
	NotifyTicketPurchased(user *models.User, tickets []models.Ticket, event *models.Event)
	NotifyWelcome(user *models.User)
	NotifyOrderConfirmation(user *models.User, order *models.Order)
	NotifySecurityEvent(user *models.User, eventName string)
	SendSystemNotification(userID uuid.UUID, title, message string)
	SendAdminNotification(title, message string, userIDs []uuid.UUID, notifType models.NotifType)
	SendBroadcastNotification(title, message string, notifType models.NotifType)
	SendEventReminderNotification(event *models.Event, userIDs []uuid.UUID)
	SendPaymentReminderNotification(order *models.Order, userID uuid.UUID)
	StartWorker()
}

type notificationService struct {
	emailService EmailService
	notifRepo    repository.NotificationRepository
	broadcaster  NotificationBroadcaster
	taskChan     chan NotificationTask
}

func NewNotificationService(emailService EmailService, notifRepo repository.NotificationRepository, broadcaster NotificationBroadcaster) NotificationService {
	return &notificationService{
		emailService: emailService,
		notifRepo:    notifRepo,
		broadcaster:  broadcaster,
		taskChan:     make(chan NotificationTask, 100),
	}
}

func (s *notificationService) StartWorker() {
	go func() {
		for task := range s.taskChan {
			s.processTask(task)
		}
	}()
}

func (s *notificationService) processTask(task NotificationTask) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in notification worker: %v", r)
		}
	}()

	switch task.Type {
	case NotificationEmailTicket:
		email := task.Payload["email"].(string)
		eventTitle := task.Payload["event_title"].(string)
		zoneName := task.Payload["zone_name"].(string)
		seatLabel := task.Payload["seat_label"].(string)
		qrToken := task.Payload["qr_token"].(string)

		if err := s.emailService.SendTicketEmail(email, eventTitle, zoneName, seatLabel, qrToken); err != nil {
			log.Printf("Error sending ticket email: %v", err)
		}

	case NotificationPushTicket:
		token := task.Payload["token"].(string)
		eventTitle := task.Payload["event_title"].(string)
		log.Printf("[PUSH SIMULATION] Sending push to token %s: Your tickets for %s are ready!", token, eventTitle)

	case NotificationWelcome:
		email := task.Payload["email"].(string)
		name := task.Payload["name"].(string)
		if err := s.emailService.SendWelcomeEmail(email, name); err != nil {
			log.Printf("Error sending welcome email: %v", err)
		}

	case NotificationOrderConf:
		email := task.Payload["email"].(string)
		orderID := task.Payload["order_id"].(string)
		total := task.Payload["total"].(float64)
		if err := s.emailService.SendOrderConfirmationEmail(email, orderID, total); err != nil {
			log.Printf("Error sending order confirmation email: %v", err)
		}
	case NotificationSystem:
		title := task.Payload["title"].(string)
		message := task.Payload["message"].(string)
		log.Printf("[SYSTEM NOTIFICATION to %s]: %s - %s", task.UserID, title, message)
	case NotificationSecurity:
		email := task.Payload["email"].(string)
		eventName := task.Payload["event_name"].(string)
		log.Printf("[SECURITY ALERT] Security notification sent to %s: %s detected", email, eventName)
	}
}

func (s *notificationService) NotifyWelcome(user *models.User) {
	s.taskChan <- NotificationTask{
		Type:   NotificationWelcome,
		UserID: user.ID.String(),
		Payload: map[string]interface{}{
			"email": user.Email,
			"name":  user.FullName,
		},
	}

	// Persist welcome notification to DB
	s.persistNotification(&user.ID, "Chào mừng bạn đến TicketRush! 🎉", "Cảm ơn bạn đã tham gia TicketRush. Hãy khám phá các sự kiện hấp dẫn ngay!", models.NotifTypeSystem, "", nil)
}

func (s *notificationService) NotifyOrderConfirmation(user *models.User, order *models.Order) {
	s.taskChan <- NotificationTask{
		Type:   NotificationOrderConf,
		UserID: user.ID.String(),
		Payload: map[string]interface{}{
			"email":    user.Email,
			"order_id": order.ID.String(),
			"total":    order.TotalAmount,
		},
	}

	// Persist order confirmation to DB
	title := "Đặt vé thành công! 🎫"
	message := fmt.Sprintf("Đơn hàng của bạn đã được xác nhận. Tổng thanh toán: %.0f VNĐ", order.TotalAmount)
	s.persistNotification(&user.ID, title, message, models.NotifTypeOrder, "order", &order.ID)
}

func (s *notificationService) NotifySecurityEvent(user *models.User, eventName string) {
	s.taskChan <- NotificationTask{
		Type:   NotificationSecurity,
		UserID: user.ID.String(),
		Payload: map[string]interface{}{
			"email":      user.Email,
			"event_name": eventName,
		},
	}

	// Persist security notification
	s.persistNotification(&user.ID, "Cảnh báo bảo mật 🔒", fmt.Sprintf("Phát hiện hoạt động: %s", eventName), models.NotifTypeSystem, "", nil)
}

func (s *notificationService) NotifyTicketPurchased(user *models.User, tickets []models.Ticket, event *models.Event) {
	for _, ticket := range tickets {
		s.taskChan <- NotificationTask{
			Type:   NotificationEmailTicket,
			UserID: user.ID.String(),
			Payload: map[string]interface{}{
				"email":       user.Email,
				"event_title": event.Title,
				"zone_name":   "Ticket",
				"seat_label":  ticket.QRCodeToken,
				"qr_token":    ticket.QRCodeToken,
			},
		}

		if user.NotificationToken != "" {
			s.taskChan <- NotificationTask{
				Type:   NotificationPushTicket,
				UserID: user.ID.String(),
				Payload: map[string]interface{}{
					"token":       user.NotificationToken,
					"event_title": event.Title,
				},
			}
		}
	}
}

func (s *notificationService) SendSystemNotification(userID uuid.UUID, title, message string) {
	s.taskChan <- NotificationTask{
		Type:   NotificationSystem,
		UserID: userID.String(),
		Payload: map[string]interface{}{
			"title":   title,
			"message": message,
		},
	}

	s.persistNotification(&userID, title, message, models.NotifTypeSystem, "", nil)
}

func (s *notificationService) SendAdminNotification(title, message string, userIDs []uuid.UUID, notifType models.NotifType) {
	var notifications []models.Notification
	for _, uid := range userIDs {
		uidCopy := uid
		notifications = append(notifications, models.Notification{
			UserID:  &uidCopy,
			Title:   title,
			Message: message,
			Type:    notifType,
		})
	}

	if err := s.notifRepo.CreateBulk(notifications); err != nil {
		log.Printf("Error creating admin notifications: %v", err)
		return
	}

	// Broadcast to each user via WebSocket
	for _, uid := range userIDs {
		s.broadcastToUser(uid, title, message, notifType)
	}
}

func (s *notificationService) SendBroadcastNotification(title, message string, notifType models.NotifType) {
	userIDs, err := s.notifRepo.FindAllUserIDs()
	if err != nil {
		log.Printf("Error finding all user IDs for broadcast: %v", err)
		return
	}

	if len(userIDs) > 0 {
		var notifications []models.Notification
		for _, uid := range userIDs {
			uidCopy := uid
			notifications = append(notifications, models.Notification{
				UserID:      &uidCopy,
				Title:       title,
				Message:     message,
				Type:        notifType,
				IsBroadcast: true,
			})
		}

		if err := s.notifRepo.CreateBulk(notifications); err != nil {
			log.Printf("Error creating broadcast notifications: %v", err)
			return
		}
	}

	// Broadcast to all connected clients
	if s.broadcaster != nil {
		s.broadcaster.Broadcast("global", map[string]interface{}{
			"type":    "NEW_NOTIFICATION",
			"title":   title,
			"message": message,
			"notif_type": string(notifType),
		})
	}
}

func (s *notificationService) SendEventReminderNotification(event *models.Event, userIDs []uuid.UUID) {
	title := fmt.Sprintf("Sắp đến giờ! 🎶 %s", event.Title)
	message := fmt.Sprintf("Sự kiện \"%s\" sẽ diễn ra trong vòng 24 giờ tới. Hãy sẵn sàng!", event.Title)

	var notifications []models.Notification
	for _, uid := range userIDs {
		uidCopy := uid
		notifications = append(notifications, models.Notification{
			UserID:        &uidCopy,
			Title:         title,
			Message:       message,
			Type:          models.NotifTypeEventReminder,
			ReferenceType: "event",
			ReferenceID:   &event.ID,
		})
	}

	if err := s.notifRepo.CreateBulk(notifications); err != nil {
		log.Printf("Error creating event reminder notifications: %v", err)
		return
	}

	for _, uid := range userIDs {
		s.broadcastToUser(uid, title, message, models.NotifTypeEventReminder)
	}
}

func (s *notificationService) SendPaymentReminderNotification(order *models.Order, userID uuid.UUID) {
	title := "Nhắc nhở thanh toán ⏰"
	message := fmt.Sprintf("Đơn hàng cho sự kiện \"%s\" sắp hết hạn. Vui lòng thanh toán trước khi hết thời gian!", order.Event.Title)

	s.persistNotification(&userID, title, message, models.NotifTypePaymentReminder, "order", &order.ID)
}

// persistNotification saves a notification to DB and broadcasts via WebSocket
func (s *notificationService) persistNotification(userID *uuid.UUID, title, message string, notifType models.NotifType, refType string, refID *uuid.UUID) {
	notification := &models.Notification{
		UserID:        userID,
		Title:         title,
		Message:       message,
		Type:          notifType,
		ReferenceType: refType,
		ReferenceID:   refID,
	}

	if s.notifRepo != nil {
		if err := s.notifRepo.Create(notification); err != nil {
			log.Printf("Error persisting notification: %v", err)
		}
	}

	if userID != nil {
		s.broadcastToUser(*userID, title, message, notifType)
	}
}

// broadcastToUser sends a real-time notification to a specific user via WebSocket
func (s *notificationService) broadcastToUser(userID uuid.UUID, title, message string, notifType models.NotifType) {
	if s.broadcaster != nil {
		channelName := fmt.Sprintf("user:%s", userID.String())
		s.broadcaster.Broadcast(channelName, map[string]interface{}{
			"type":       "NEW_NOTIFICATION",
			"title":      title,
			"message":    message,
			"notif_type": string(notifType),
		})
	}
}
