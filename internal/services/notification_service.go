package services

import (
	"errors"
	"log"
	"nexus-backend/internal/models"
	"nexus-backend/internal/realtime"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationService struct {
	DB           *gorm.DB
	Hub          *realtime.Hub
	EmailService EmailService
}

var ErrNotificationNotFound = errors.New("notification not found")

type NotificationPreference string

const (
	PrefNotifyComments        NotificationPreference = "notify_comments"
	PrefNotifyDueDates        NotificationPreference = "notify_due_dates"
	PrefNotifyRemovedFromCard NotificationPreference = "notify_removed_from_card"
	PrefNotifyAttachments     NotificationPreference = "notify_attachments"
	PrefNotifyCardCreated     NotificationPreference = "notify_card_created"
	PrefNotifyCardMoved       NotificationPreference = "notify_card_moved"
	PrefNotifyCardArchived    NotificationPreference = "notify_card_archived"
)

func NewNotificationService(db *gorm.DB, hub *realtime.Hub, emailService EmailService) *NotificationService {
	return &NotificationService{DB: db, Hub: hub, EmailService: emailService}
}

func (s *NotificationService) CreateNotification(recipientID, actorID uuid.UUID, nType models.NotificationType, title, message string, entityID uuid.UUID, entityType string, pref NotificationPreference) (*models.Notification, error) {
	// DEBUG: Print creation
	log.Printf("[NotificationService] CreateNotification for user %s: %s", recipientID, title)

	var boardID *uuid.UUID

	// Resolve BoardID based on EntityType
	if entityType == "BOARD" {
		boardID = &entityID
	} else if entityType == "CARD" {
		var card models.Card
		if err := s.DB.Preload("Column").First(&card, "id = ?", entityID).Error; err == nil {
			boardID = &card.Column.BoardID
		}
	}

	notification := &models.Notification{
		ID:         uuid.New(),
		UserID:     recipientID,
		ActorID:    &actorID,
		Type:       nType,
		Title:      title,
		Message:    message,
		EntityID:   entityID,
		EntityType: entityType,
		IsRead:     false,
		BoardID:    boardID,
	}

	if err := s.DB.Create(notification).Error; err != nil {
		return nil, err
	}

	// Fetch actor for the frontend
	s.DB.Preload("Actor").First(notification, notification.ID)

	// Broadcast via WebSocket
	if s.Hub != nil {
		s.Hub.BroadcastToUser(recipientID.String(), "NOTIFICATION_RECEIVED", notification)
	}

	if s.EmailService != nil && s.shouldSendEmail(recipientID, pref) {
		var recipient models.User
		if err := s.DB.Select("email").First(&recipient, "id = ?", recipientID).Error; err == nil && recipient.Email != "" {
			subject := "Nexus Notification: " + title
			body := message
			if err := s.EmailService.SendNotificationEmail(recipient.Email, subject, body); err != nil {
				log.Printf("[NotificationService] failed sending notification email to %s: %v", recipient.Email, err)
			}
		}
	}

	return notification, nil
}

func (s *NotificationService) shouldSendEmail(userID uuid.UUID, pref NotificationPreference) bool {
	if pref == "" {
		return true
	}

	var p models.UserPreferences
	if err := s.DB.Where("user_id = ?", userID).First(&p).Error; err != nil {
		// No explicit preferences: keep existing default behavior enabled.
		return true
	}

	switch pref {
	case PrefNotifyComments:
		return p.NotifyComments
	case PrefNotifyDueDates:
		return p.NotifyDueDates
	case PrefNotifyRemovedFromCard:
		return p.NotifyRemovedFromCard
	case PrefNotifyAttachments:
		return p.NotifyAttachments
	case PrefNotifyCardCreated:
		return p.NotifyCardCreated
	case PrefNotifyCardMoved:
		return p.NotifyCardMoved
	case PrefNotifyCardArchived:
		return p.NotifyCardArchived
	default:
		return true
	}
}

func (s *NotificationService) GetNotifications(userID uuid.UUID, limit int, workspaceID *uuid.UUID) ([]models.Notification, error) {
	var notifications []models.Notification
	query := s.DB.Where("user_id = ?", userID).
		Preload("Actor")

	if workspaceID != nil {
		boardSubQuery := s.DB.Table("boards").Select("id").Where("workspace_id = ?", *workspaceID)
		query = query.Where(
			"(board_id IN (?) OR (entity_type = ? AND entity_id = ?))",
			boardSubQuery,
			"WORKSPACE",
			*workspaceID,
		)
	}

	err := query.Order("created_at desc").
		Limit(limit).
		Find(&notifications).Error
	return notifications, err
}

func (s *NotificationService) MarkAsRead(notificationID uuid.UUID) error {
	return s.DB.Model(&models.Notification{}).Where("id = ?", notificationID).Update("is_read", true).Error
}

func (s *NotificationService) MarkAsReadForUser(notificationID, userID uuid.UUID) error {
	result := s.DB.Model(&models.Notification{}).Where("id = ? AND user_id = ?", notificationID, userID).Update("is_read", true)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotificationNotFound
	}
	return nil
}

func (s *NotificationService) MarkAllAsRead(userID uuid.UUID, workspaceID *uuid.UUID) error {
	query := s.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false)

	if workspaceID != nil {
		boardSubQuery := s.DB.Table("boards").Select("id").Where("workspace_id = ?", *workspaceID)
		query = query.Where(
			"(board_id IN (?) OR (entity_type = ? AND entity_id = ?))",
			boardSubQuery,
			"WORKSPACE",
			*workspaceID,
		)
	}

	return query.Update("is_read", true).Error
}

func (s *NotificationService) NotifySubscribers(subscribers []uuid.UUID, actorID uuid.UUID, nType models.NotificationType, title, message string, entityID uuid.UUID, entityType string, pref NotificationPreference) {
	for _, subID := range subscribers {
		// Don't notify the actor
		if subID == actorID {
			continue
		}
		s.CreateNotification(subID, actorID, nType, title, message, entityID, entityType, pref)
	}
}
