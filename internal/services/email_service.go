package services

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
)

// EmailService defines the interface for sending emails
type EmailService interface {
	SendInvitationEmail(recipientEmail, workspaceName, inviterName, inviteLink string) error
	SendJoinRequestApprovedEmail(recipientEmail, workspaceName string) error
	SendNotificationEmail(recipientEmail, subject, body string) error
}

// ConsoleEmailService is a mock implementation that logs emails to stdout
type ConsoleEmailService struct{}

func NewConsoleEmailService() *ConsoleEmailService {
	return &ConsoleEmailService{}
}

func (s *ConsoleEmailService) SendInvitationEmail(recipientEmail, workspaceName, inviterName, inviteLink string) error {
	log.Printf("\n[EMAIL SERVICE] ---------------------------------------------------")
	log.Printf("[EMAIL SERVICE] To: %s", recipientEmail)
	log.Printf("[EMAIL SERVICE] Subject: You've been invited to join %s on Nexus", workspaceName)
	log.Printf("[EMAIL SERVICE] Body:")
	log.Printf("[EMAIL SERVICE] Hi there,")
	log.Printf("[EMAIL SERVICE] %s has invited you to join the workspace '%s'.", inviterName, workspaceName)
	log.Printf("[EMAIL SERVICE] Click here to join: %s", inviteLink)
	log.Printf("[EMAIL SERVICE] ---------------------------------------------------\n")
	return nil
}

func (s *ConsoleEmailService) SendJoinRequestApprovedEmail(recipientEmail, workspaceName string) error {
	log.Printf("\n[EMAIL SERVICE] ---------------------------------------------------")
	log.Printf("[EMAIL SERVICE] To: %s", recipientEmail)
	log.Printf("[EMAIL SERVICE] Subject: Join Request Approved for %s", workspaceName)
	log.Printf("[EMAIL SERVICE] Body:")
	log.Printf("[EMAIL SERVICE] Hi there,")
	log.Printf("[EMAIL SERVICE] Your request to join the workspace '%s' has been approved!", workspaceName)
	log.Printf("[EMAIL SERVICE] You can now access the workspace board.")
	log.Printf("[EMAIL SERVICE] ---------------------------------------------------\n")
	return nil
}

func (s *ConsoleEmailService) SendNotificationEmail(recipientEmail, subject, body string) error {
	log.Printf("\n[EMAIL SERVICE] ---------------------------------------------------")
	log.Printf("[EMAIL SERVICE] To: %s", recipientEmail)
	log.Printf("[EMAIL SERVICE] Subject: %s", subject)
	log.Printf("[EMAIL SERVICE] Body:")
	log.Printf("[EMAIL SERVICE] %s", body)
	log.Printf("[EMAIL SERVICE] ---------------------------------------------------\n")
	return nil
}

type SMTPEmailService struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

func NewSMTPEmailService(host, port, username, password, from string) *SMTPEmailService {
	return &SMTPEmailService{
		Host:     host,
		Port:     port,
		Username: username,
		Password: password,
		From:     from,
	}
}

func NewEmailServiceFromEnv() EmailService {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USERNAME")
	pass := os.Getenv("SMTP_PASSWORD")
	from := os.Getenv("SMTP_FROM")

	if host == "" || port == "" || from == "" {
		log.Println("[EMAIL SERVICE] SMTP not configured, using console email service")
		return NewConsoleEmailService()
	}

	log.Printf("[EMAIL SERVICE] SMTP configured (%s:%s), using SMTP email service", host, port)
	return NewSMTPEmailService(host, port, user, pass, from)
}

func (s *SMTPEmailService) send(recipientEmail, subject, body string) error {
	msg := "" +
		fmt.Sprintf("From: %s\r\n", s.From) +
		fmt.Sprintf("To: %s\r\n", recipientEmail) +
		fmt.Sprintf("Subject: %s\r\n", subject) +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=\"UTF-8\"\r\n" +
		"\r\n" +
		body

	addr := fmt.Sprintf("%s:%s", s.Host, s.Port)
	if s.Username == "" || s.Password == "" {
		return smtp.SendMail(addr, nil, s.From, []string{recipientEmail}, []byte(msg))
	}

	auth := smtp.PlainAuth("", s.Username, s.Password, s.Host)
	return smtp.SendMail(addr, auth, s.From, []string{recipientEmail}, []byte(msg))
}

func (s *SMTPEmailService) SendInvitationEmail(recipientEmail, workspaceName, inviterName, inviteLink string) error {
	subject := fmt.Sprintf("You've been invited to join %s on Nexus", workspaceName)
	body := fmt.Sprintf("Hi there,\n\n%s has invited you to join the workspace '%s'.\nClick here to join: %s\n", inviterName, workspaceName, inviteLink)
	return s.send(recipientEmail, subject, body)
}

func (s *SMTPEmailService) SendJoinRequestApprovedEmail(recipientEmail, workspaceName string) error {
	subject := fmt.Sprintf("Join Request Approved for %s", workspaceName)
	body := fmt.Sprintf("Hi there,\n\nYour request to join the workspace '%s' has been approved!\nYou can now access the workspace board.\n", workspaceName)
	return s.send(recipientEmail, subject, body)
}

func (s *SMTPEmailService) SendNotificationEmail(recipientEmail, subject, body string) error {
	return s.send(recipientEmail, subject, body)
}
