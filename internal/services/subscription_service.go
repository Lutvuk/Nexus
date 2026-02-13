package services

import (
	"nexus-backend/internal/models"
	"nexus-backend/internal/repository"

	"github.com/google/uuid"
)

type SubscriptionService struct {
	Repo *repository.SubscriptionRepository
}

func NewSubscriptionService(repo *repository.SubscriptionRepository) *SubscriptionService {
	return &SubscriptionService{Repo: repo}
}

func (s *SubscriptionService) Subscribe(userID, entityID uuid.UUID, entityType models.SubscriptionType) error {
	return s.Repo.Subscribe(userID, entityID, entityType)
}

func (s *SubscriptionService) Unsubscribe(userID, entityID uuid.UUID) error {
	return s.Repo.Unsubscribe(userID, entityID)
}

func (s *SubscriptionService) IsSubscribed(userID, entityID uuid.UUID) (bool, error) {
	return s.Repo.IsSubscribed(userID, entityID)
}

func (s *SubscriptionService) GetSubscribers(entityID uuid.UUID) ([]uuid.UUID, error) {
	return s.Repo.GetSubscribers(entityID)
}

func (s *SubscriptionService) GetCardRelatedSubscribers(cardID uuid.UUID) ([]uuid.UUID, error) {
	return s.Repo.GetSubscribersForCard(cardID)
}
