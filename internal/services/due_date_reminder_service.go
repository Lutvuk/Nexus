package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"nexus-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DueDateReminderService scans for cards due soon and sends reminder notifications.
type DueDateReminderService struct {
	DB                  *gorm.DB
	NotificationService *NotificationService
	SubscriptionService *SubscriptionService
	AutomationService   *AutomationService
	Window              time.Duration
}

type DueReminderRunStats struct {
	CardsScanned      int `json:"cards_scanned"`
	RecipientsChecked int `json:"recipients_checked"`
	NotificationsSent int `json:"notifications_sent"`
}

func NewDueDateReminderService(db *gorm.DB, notificationService *NotificationService, subscriptionService *SubscriptionService, automationService *AutomationService, window time.Duration) *DueDateReminderService {
	return &DueDateReminderService{
		DB:                  db,
		NotificationService: notificationService,
		SubscriptionService: subscriptionService,
		AutomationService:   automationService,
		Window:              window,
	}
}

func (s *DueDateReminderService) Start(ctx context.Context, interval time.Duration) {
	// Run once on startup so reminders are available without waiting for the first tick.
	s.RunOnce()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[DueDateReminder] Stopped")
			return
		case <-ticker.C:
			s.RunOnce()
		}
	}
}

func (s *DueDateReminderService) RunOnce() DueReminderRunStats {
	stats := DueReminderRunStats{}

	if s.NotificationService == nil {
		return stats
	}

	now := time.Now()
	cutoff := now.Add(s.Window)

	var cards []models.Card
	if err := s.DB.
		Preload("Members").
		Where("due_date IS NOT NULL AND due_date > ? AND due_date <= ? AND is_archived = ? AND is_complete = ?", now, cutoff, false, false).
		Find(&cards).Error; err != nil {
		log.Printf("[DueDateReminder] query failed: %v", err)
		return stats
	}
	stats.CardsScanned = len(cards)

	for _, card := range cards {
		recipients := map[uuid.UUID]struct{}{}
		for _, member := range card.Members {
			recipients[member.ID] = struct{}{}
		}

		if s.SubscriptionService != nil {
			if subscribers, err := s.SubscriptionService.GetCardRelatedSubscribers(card.ID); err == nil {
				for _, sub := range subscribers {
					recipients[sub] = struct{}{}
				}
			}
		}

		for recipientID := range recipients {
			stats.RecipientsChecked++

			if s.reminderRecentlySent(recipientID, card.ID, now) {
				continue
			}

			title := "Card Due Soon"
			message := fmt.Sprintf("Card '%s' is due at %s.", card.Title, card.DueDate.Local().Format("Mon, 02 Jan 2006 15:04"))

			_, err := s.NotificationService.CreateNotification(
				recipientID,
				recipientID, // system-style reminder with self as actor fallback
				models.NotificationDueSoon,
				title,
				message,
				card.ID,
				"CARD",
				PrefNotifyDueDates,
			)
			if err != nil {
				log.Printf("[DueDateReminder] failed to create notification for user %s card %s: %v", recipientID, card.ID, err)
				continue
			}
			stats.NotificationsSent++
		}
	}

	if stats.NotificationsSent > 0 {
		log.Printf("[DueDateReminder] Sent %d due-date reminder(s)", stats.NotificationsSent)
	}

	s.evaluateOverdueAutomations(now)
	return stats
}

func (s *DueDateReminderService) evaluateOverdueAutomations(now time.Time) {
	if s.AutomationService == nil {
		return
	}

	var overdueCards []models.Card
	if err := s.DB.Preload("Column").
		Where("due_date IS NOT NULL AND due_date <= ? AND is_archived = ? AND is_complete = ?", now, false, false).
		Find(&overdueCards).Error; err != nil {
		return
	}

	for _, card := range overdueCards {
		ctx := map[string]interface{}{
			"card_id":     card.ID.String(),
			"is_overdue":  true,
			"due_date_at": card.DueDate,
		}
		s.AutomationService.EvaluateRules(card.Column.BoardID, models.TriggerDueDateOverdue, ctx)
	}
}

func (s *DueDateReminderService) reminderRecentlySent(userID, cardID uuid.UUID, now time.Time) bool {
	var count int64
	s.DB.Model(&models.Notification{}).
		Where("user_id = ? AND type = ? AND entity_id = ? AND created_at >= ?",
			userID,
			models.NotificationDueSoon,
			cardID,
			now.Add(-24*time.Hour),
		).
		Count(&count)
	return count > 0
}
