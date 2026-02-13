package services

import (
	"time"

	"nexus-backend/internal/models"
	"nexus-backend/internal/repository"

	"github.com/google/uuid"
)

type CardService struct {
	Repo              *repository.CardRepository
	AutomationService *AutomationService
}

func NewCardService(repo *repository.CardRepository, automationService *AutomationService) *CardService {
	return &CardService{Repo: repo, AutomationService: automationService}
}

// GetMaxPositionWrapper to satisfy ActionExecutor interface
func (s *CardService) GetMaxPosition(columnID uuid.UUID) float64 {
	return s.Repo.GetMaxPosition(columnID)
}

func (s *CardService) CreateCard(title, description string, columnID uuid.UUID) (*models.Card, error) {
	// Calc next position
	pos := s.Repo.GetMaxPosition(columnID)

	card := &models.Card{
		Title:       title,
		Description: description,
		ColumnID:    columnID,
		Position:    pos,
	}

	err := s.Repo.Create(card)
	if err == nil && s.AutomationService != nil {
		// Fetch full card to get BoardID
		if fullCard, err := s.Repo.FindByIDWithChecklists(card.ID); err == nil {
			ctx := map[string]interface{}{
				"card_id":   card.ID.String(),
				"column_id": columnID.String(),
			}
			s.AutomationService.EvaluateRules(fullCard.Column.BoardID, models.TriggerCardCreated, ctx)
		}
	}
	return card, err
}

func (s *CardService) UpdateCard(id uuid.UUID, title, description string, dueDate *time.Time, isComplete *bool) (*models.Card, error) {
	card, err := s.Repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if title != "" {
		card.Title = title
	}

	// If description is provided (even if empty), update it.
	// We might need a better way to handle "not provided" vs "provided as empty",
	// but for now we'll assume the title check above is the pattern.
	// Actually, let's allow updating description to empty.
	card.Description = description

	if dueDate != nil {
		card.DueDate = dueDate
	}

	if isComplete != nil {
		card.IsComplete = *isComplete
	}

	err = s.Repo.Update(card)

	if err == nil && s.AutomationService != nil && dueDate != nil {
		// Treat due-date update as both due-date and calendar trigger.
		if fullCard, err := s.Repo.FindByIDWithChecklists(card.ID); err == nil {
			ctx := map[string]interface{}{
				"card_id": card.ID.String(),
			}
			s.AutomationService.EvaluateRules(fullCard.Column.BoardID, models.TriggerDueDateSet, ctx)
			s.AutomationService.EvaluateRules(fullCard.Column.BoardID, models.TriggerCalendarSet, ctx)
		}
	}

	if err == nil && s.AutomationService != nil && isComplete != nil && *isComplete {
		// Fetch with Column for BoardID
		if fullCard, err := s.Repo.FindByIDWithChecklists(card.ID); err == nil {
			ctx := map[string]interface{}{
				"card_id": card.ID.String(),
			}
			s.AutomationService.EvaluateRules(fullCard.Column.BoardID, models.TriggerCardCompleted, ctx)
		}
	}

	return card, err
}

func (s *CardService) AddLabel(cardID, labelID uuid.UUID) error {
	err := s.Repo.AddLabel(cardID, labelID)
	if err == nil && s.AutomationService != nil {
		if fullCard, err := s.Repo.FindByIDWithChecklists(cardID); err == nil {
			ctx := map[string]interface{}{
				"card_id":  cardID.String(),
				"label_id": labelID.String(),
			}
			s.AutomationService.EvaluateRules(fullCard.Column.BoardID, models.TriggerLabelAdded, ctx)
		}
	}
	return err
}

func (s *CardService) RemoveLabel(cardID, labelID uuid.UUID) error {
	return s.Repo.RemoveLabel(cardID, labelID)
}

func (s *CardService) AddMember(cardID, userID uuid.UUID) error {
	err := s.Repo.AddMember(cardID, userID)
	if err == nil && s.AutomationService != nil {
		if fullCard, err := s.Repo.FindByIDWithChecklists(cardID); err == nil {
			ctx := map[string]interface{}{
				"card_id": cardID.String(),
				"user_id": userID.String(),
			}
			s.AutomationService.EvaluateRules(fullCard.Column.BoardID, models.TriggerMemberAdded, ctx)
		}
	}
	return err
}

func (s *CardService) RemoveMember(cardID, userID uuid.UUID) error {
	return s.Repo.RemoveMember(cardID, userID)
}

func (s *CardService) DeleteCard(id uuid.UUID) error {
	return s.Repo.Delete(id)
}

func (s *CardService) ArchiveCard(id uuid.UUID) error {
	return s.Repo.Archive(id)
}

func (s *CardService) RestoreCard(id uuid.UUID, columnID uuid.UUID) error {
	return s.Repo.Restore(id, columnID)
}

func (s *CardService) MoveCard(id uuid.UUID, newColumnID uuid.UUID, newPosition float64) (*models.Card, error) {
	card, err := s.Repo.MoveCardTransaction(id, newColumnID, newPosition)
	if err != nil {
		return nil, err
	}

	if s.AutomationService != nil {
		ctx := map[string]interface{}{
			"card_id":      id.String(),
			"to_column_id": newColumnID.String(),
		}
		// card.Column is preloaded in MoveCardTransaction
		s.AutomationService.EvaluateRules(card.Column.BoardID, models.TriggerCardMoved, ctx)
	}

	return card, nil
}

// GetCardByID returns a card with all its checklists and items
func (s *CardService) GetCardByID(id uuid.UUID) (*models.Card, error) {
	return s.Repo.FindByIDWithChecklists(id)
}

func (s *CardService) CopyCard(originalCardID, targetColumnID uuid.UUID) (*models.Card, error) {
	// 1. Calculate position (Bottom of target column)
	pos := s.Repo.GetMaxPosition(targetColumnID)

	// 2. Perform Copy
	return s.Repo.CopyCard(originalCardID, targetColumnID, pos)
}

func (s *CardService) SaveCardAsTemplate(cardID uuid.UUID, templateName string) (*models.Card, error) {
	card, err := s.Repo.FindByID(cardID)
	if err != nil {
		return nil, err
	}
	card.IsTemplate = true
	card.TemplateName = templateName
	err = s.Repo.Update(card)
	return card, err
}

func (s *CardService) GetCardTemplates(boardID uuid.UUID) ([]models.Card, error) {
	return s.Repo.FindTemplatesByBoardID(boardID)
}
