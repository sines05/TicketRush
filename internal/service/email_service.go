package service

import (
	"fmt"
	"log"
	"net/smtp"
	"ticketrush/internal/config"

	"github.com/skip2/go-qrcode"
)

type EmailService interface {
	SendTicketEmail(to, eventTitle, zoneName, seatLabel, qrToken string) error
	Send2FACode(to, code string) error
	SendWelcomeEmail(to, name string) error
	SendOrderConfirmationEmail(to, orderID string, total float64) error
}

type emailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) EmailService {
	return &emailService{cfg: cfg}
}

func (s *emailService) SendWelcomeEmail(to, name string) error {
	subject := "Subject: Welcome to TicketRush!\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf("<html><body>"+
		"<h1>Welcome to TicketRush, %s!</h1>"+
		"<p>We're excited to have you on board. Start exploring the best events now!</p>"+
		"</body></html>", name)

	msg := []byte(subject + mime + body)

	if s.cfg.SMTPUser == "" {
		log.Printf("\n[EMAIL SIMULATION] To: %s\nSubject: %s\nBody: %s\n", to, subject, body)
		return nil
	}

	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPass, s.cfg.SMTPHost)
	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)
	return smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{to}, msg)
}

func (s *emailService) SendOrderConfirmationEmail(to, orderID string, total float64) error {
	subject := fmt.Sprintf("Subject: Order Confirmation - %s\n", orderID)
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf("<html><body>"+
		"<h1>Thank you for your order!</h1>"+
		"<p>Order ID: <b>%s</b></p>"+
		"<p>Total Amount: <b>$%.2f</b></p>"+
		"<p>Your tickets are being processed and will be available in your account shortly.</p>"+
		"</body></html>", orderID, total)

	msg := []byte(subject + mime + body)

	if s.cfg.SMTPUser == "" {
		log.Printf("\n[EMAIL SIMULATION] To: %s\nSubject: %s\nBody: %s\n", to, subject, body)
		return nil
	}

	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPass, s.cfg.SMTPHost)
	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)
	return smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{to}, msg)
}

func (s *emailService) SendTicketEmail(to, eventTitle, zoneName, seatLabel, qrToken string) error {
	// 1. Generate QR Code
	qrData := fmt.Sprintf("https://ticketrush.com/verify/%s", qrToken)
	qrCode, err := qrcode.Encode(qrData, qrcode.Medium, 256)
	if err != nil {
		return fmt.Errorf("failed to generate QR code: %v", err)
	}

	// In a real app, you'd attach the qrCode bytes as an image to the email.
	// For this simulation, we'll log it and send a text email.
	
	subject := fmt.Sprintf("Subject: Your Ticket for %s\n", eventTitle)
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf("<html><body>"+
		"<h1>Your Ticket is here!</h1>"+
		"<p>Event: <b>%s</b></p>"+
		"<p>Zone: %s</p>"+
		"<p>Seat: %s</p>"+
		"<p>Please show the QR code below at the entrance.</p>"+
		"<p>(QR Code Token: %s)</p>"+
		"</body></html>", eventTitle, zoneName, seatLabel, qrToken)

	msg := []byte(subject + mime + body)

	// SMTP Config
	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPass, s.cfg.SMTPHost)
	
	// Simulation: If SMTPUser is empty, just log it.
	if s.cfg.SMTPUser == "" {
		log.Printf("\n[EMAIL SIMULATION] To: %s\nSubject: %s\nBody: %s\nQR Token: %s\n", to, subject, body, qrToken)
		log.Printf("[EMAIL SIMULATION] QR Code generated (%d bytes)\n", len(qrCode))
		return nil
	}

	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)
	if err := smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{to}, msg); err != nil {
		log.Printf("Failed to send email: %v", err)
		return err
	}

	return nil
}

func (s *emailService) Send2FACode(to, code string) error {
	subject := "Subject: Your 2FA Verification Code\n"
	body := fmt.Sprintf("Your verification code is: %s. It will expire in 10 minutes.", code)
	msg := []byte(subject + "\n" + body)

	if s.cfg.SMTPUser == "" {
		log.Printf("\n[EMAIL SIMULATION] To: %s\nBody: %s\n", to, body)
		return nil
	}

	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPass, s.cfg.SMTPHost)
	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)
	return smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{to}, msg)
}
