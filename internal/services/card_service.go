package services

import (
	"nexus-backend/internal/models"
	"nexus-backend/internal/repository"

	"github.com/google/uuid"
)

type CardService struct {
	Repo *repository.CardRepository
}

func NewCardService(repo *repository.CardRepository) *CardService {
	return &CardService{Repo: repo}
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
	return card, err
}

func (s *CardService) UpdateCard(id uuid.UUID, title, description string) (*models.Card, error) {
	card, err := s.Repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	
	if title != "" {
		card.Title = title
	}
	if description != "" {
		card.Description = description
	}
	
	err = s.Repo.Update(card)
	return card, err
}

func (s *CardService) DeleteCard(id uuid.UUID) error {
	return s.Repo.Delete(id)
}

func (s *CardService) MoveCard(id uuid.UUID, newColumnID uuid.UUID, newPosition int) (*models.Card, error) {
	return s.Repo.MoveCardTransaction(id, newColumnID, newPosition)
}
