package services

import (
	"encoding/json"
	"log"
	"nexus-backend/internal/models"
	"nexus-backend/internal/repository"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ActionExecutor defines the methods required from CardService to execute actions.
type ActionExecutor interface {
	MoveCard(id uuid.UUID, newColumnID uuid.UUID, newPosition float64) (*models.Card, error)
	AddLabel(cardID, labelID uuid.UUID) error
	UpdateCard(id uuid.UUID, title, description string, dueDate *time.Time, isComplete *bool) (*models.Card, error)
	AddMember(cardID, userID uuid.UUID) error
	GetMaxPosition(columnID uuid.UUID) float64
	ArchiveCard(id uuid.UUID) error
}

type AutomationService struct {
	Repo                repository.AutomationRepository
	Executor            ActionExecutor
	DB                  *gorm.DB
	NotificationService *NotificationService
}

func NewAutomationService(repo repository.AutomationRepository) *AutomationService {
	return &AutomationService{Repo: repo}
}

func (s *AutomationService) SetExecutor(executor ActionExecutor) {
	s.Executor = executor
}

func (s *AutomationService) SetDependencies(db *gorm.DB, notificationService *NotificationService) {
	s.DB = db
	s.NotificationService = notificationService
}

func (s *AutomationService) CreateRule(rule *models.AutomationRule) error {
	return s.Repo.CreateRule(rule)
}

func (s *AutomationService) GetRulesByBoard(boardID uuid.UUID) ([]models.AutomationRule, error) {
	return s.Repo.GetRulesByBoard(boardID)
}

func (s *AutomationService) DeleteRule(id uuid.UUID) error {
	return s.Repo.DeleteRule(id)
}

// EvaluateRules checks for rules matching the trigger and executes them.
// context is a map containing relevant IDs (e.g. card_id, column_id, etc.)
func (s *AutomationService) EvaluateRules(boardID uuid.UUID, trigger models.TriggerType, context map[string]interface{}) {
	if s.Executor == nil {
		log.Println("[Automation] No executor set, skipping evaluation")
		return
	}

	rules, err := s.Repo.GetRulesByBoard(boardID)
	if err != nil {
		log.Printf("[Automation] Failed to fetch rules: %v", err)
		return
	}

	for _, rule := range rules {
		if !rule.IsActive || rule.TriggerType != trigger {
			continue
		}

		if s.checkConditions(rule, context) {
			log.Printf("[Automation] Rule matched: %s. Executing action...", rule.Name)
			go s.executeAction(rule, context) // Run async to prevent blocking the original request
		}
	}
}

func (s *AutomationService) checkConditions(rule models.AutomationRule, context map[string]interface{}) bool {
	var conditions map[string]interface{}
	if err := json.Unmarshal(rule.Conditions, &conditions); err != nil {
		log.Printf("[Automation] Failed to unmarshal conditions: %v", err)
		return false
	}

	for key, expectedVal := range conditions {
		actualVal, exists := context[key]
		if !exists {
			return false // Context missing required key
		}

		// Simple equality check for strings/UUIDs
		if expectedVal != actualVal {
			return false
		}
	}
	return true
}

func (s *AutomationService) executeAction(rule models.AutomationRule, context map[string]interface{}) {
	var params map[string]interface{}
	if err := json.Unmarshal(rule.ActionParams, &params); err != nil {
		log.Printf("[Automation] Failed to unmarshal action params: %v", err)
		return
	}

	// Extract CardID from context
	cardIDStr, ok := context["card_id"].(string)
	if !ok {
		log.Println("[Automation] Missing card_id in context")
		return
	}
	cardID, _ := uuid.Parse(cardIDStr)

	switch rule.ActionType {
	case models.ActionMoveCard:
		targetColumnIDStr, ok := params["target_column_id"].(string)
		if ok {
			targetColumnID, _ := uuid.Parse(targetColumnIDStr)
			// Calculate position: Bottom of column
			pos := s.Executor.GetMaxPosition(targetColumnID) + 65536 // Add gap
			s.Executor.MoveCard(cardID, targetColumnID, pos)
		}

	case models.ActionAddLabel:
		labelIDStr, ok := params["label_id"].(string)
		if ok {
			labelID, _ := uuid.Parse(labelIDStr)
			s.Executor.AddLabel(cardID, labelID)
		}

	case models.ActionSetComplete:
		isComplete := true
		s.Executor.UpdateCard(cardID, "", "", nil, &isComplete)

	case models.ActionAssignMember:
		userIDStr, ok := params["user_id"].(string)
		if ok {
			userID, _ := uuid.Parse(userIDStr)
			s.Executor.AddMember(cardID, userID)
		}

	case models.ActionArchiveCard:
		s.Executor.ArchiveCard(cardID)

	case models.ActionSetDueDate:
		// Params: { "days_from_now": number }
		days := 0
		if raw, ok := params["days_from_now"]; ok {
			switch v := raw.(type) {
			case float64:
				days = int(v)
			case int:
				days = v
			}
		}
		due := time.Now().AddDate(0, 0, days)
		s.Executor.UpdateCard(cardID, "", "", &due, nil)

	case models.ActionNotifyAssignees:
		s.notifyAssignees(cardID, params)
	case models.ActionNotifyAdmins:
		s.notifyWorkspaceAdmins(cardID, params)
	}
}

func (s *AutomationService) ToggleRule(ruleID uuid.UUID) error {
	return s.Repo.ToggleRule(ruleID)
}

func (s *AutomationService) notifyAssignees(cardID uuid.UUID, params map[string]interface{}) {
	if s.DB == nil || s.NotificationService == nil {
		return
	}

	var card models.Card
	if err := s.DB.Preload("Members").Preload("Column").First(&card, "id = ?", cardID).Error; err != nil {
		return
	}

	title := "Card Automation Alert"
	message := "A card assigned to you triggered an automation."
	if v, ok := params["title"].(string); ok && v != "" {
		title = v
	}
	if v, ok := params["message"].(string); ok && v != "" {
		message = v
	}

	for _, member := range card.Members {
		if !s.shouldSendAutomationNotification(member.ID, cardID, title) {
			continue
		}
		_, _ = s.NotificationService.CreateNotification(
			member.ID,
			member.ID,
			models.NotificationMention,
			title,
			message,
			cardID,
			"CARD",
			PrefNotifyDueDates,
		)
	}
}

func (s *AutomationService) notifyWorkspaceAdmins(cardID uuid.UUID, params map[string]interface{}) {
	if s.DB == nil || s.NotificationService == nil {
		return
	}

	var card models.Card
	if err := s.DB.Preload("Column").First(&card, "id = ?", cardID).Error; err != nil {
		return
	}

	var board models.Board
	if err := s.DB.First(&board, "id = ?", card.Column.BoardID).Error; err != nil {
		return
	}

	title := "Urgent Card Alert"
	message := "A card triggered an urgent automation rule."
	if v, ok := params["title"].(string); ok && v != "" {
		title = v
	}
	if v, ok := params["message"].(string); ok && v != "" {
		message = v
	}

	var workspace models.Workspace
	if err := s.DB.Select("owner_id").First(&workspace, "id = ?", board.WorkspaceID).Error; err != nil {
		return
	}

	recipients := map[uuid.UUID]struct{}{workspace.OwnerID: {}}
	var admins []models.WorkspaceMember
	if err := s.DB.Where("workspace_id = ? AND role = ? AND status = 'accepted'", board.WorkspaceID, "admin").Find(&admins).Error; err == nil {
		for _, admin := range admins {
			recipients[admin.UserID] = struct{}{}
		}
	}

	for recipient := range recipients {
		if !s.shouldSendAutomationNotification(recipient, cardID, title) {
			continue
		}
		_, _ = s.NotificationService.CreateNotification(
			recipient,
			recipient,
			models.NotificationMention,
			title,
			message,
			cardID,
			"CARD",
			PrefNotifyComments,
		)
	}
}

func (s *AutomationService) shouldSendAutomationNotification(userID, cardID uuid.UUID, title string) bool {
	if s.DB == nil {
		return true
	}
	var count int64
	s.DB.Model(&models.Notification{}).
		Where("user_id = ? AND entity_id = ? AND title = ? AND created_at >= ?", userID, cardID, title, time.Now().Add(-4*time.Hour)).
		Count(&count)
	return count == 0
}
