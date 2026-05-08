package service

import (
	"log"
	"ticketrush/internal/models"
)

type NotificationType string

const (
	NotificationEmailTicket NotificationType = "EMAIL_TICKET"
	NotificationPushTicket  NotificationType = "PUSH_TICKET"
	NotificationWelcome     NotificationType = "WELCOME"
	NotificationOrderConf   NotificationType = "ORDER_CONFIRMATION"
)

type NotificationTask struct {
	Type    NotificationType
	UserID  string
	Payload map[string]interface{}
}

type NotificationService interface {
	NotifyTicketPurchased(user *models.User, tickets []models.Ticket, event *models.Event)
	NotifyWelcome(user *models.User)
	NotifyOrderConfirmation(user *models.User, order *models.Order)
	StartWorker()
}

type notificationService struct {
	emailService EmailService
	taskChan     chan NotificationTask
}

func NewNotificationService(emailService EmailService) NotificationService {
	return &notificationService{
		emailService: emailService,
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
		// Simulated WebPush/FCM
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
}

func (s *notificationService) NotifyTicketPurchased(user *models.User, tickets []models.Ticket, event *models.Event) {
	for _, ticket := range tickets {
		// Queue Email Task
		s.taskChan <- NotificationTask{
			Type:   NotificationEmailTicket,
			UserID: user.ID.String(),
			Payload: map[string]interface{}{
				"email":       user.Email,
				"event_title": event.Title,
				"zone_name":   "Ticket", // Simplified, in real app get from ticket.Seat.Zone
				"seat_label":  ticket.QRCodeToken, // Simplified
				"qr_token":    ticket.QRCodeToken,
			},
		}

		// Queue Push Task if token exists
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
