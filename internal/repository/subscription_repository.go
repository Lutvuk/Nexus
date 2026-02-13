package repository

import (
	"log"
	"nexus-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SubscriptionRepository struct {
	DB *gorm.DB
}

func NewSubscriptionRepository(db *gorm.DB) *SubscriptionRepository {
	return &SubscriptionRepository{DB: db}
}

func (r *SubscriptionRepository) Subscribe(userID, entityID uuid.UUID, entityType models.SubscriptionType) error {
	sub := models.Subscription{
		ID:         uuid.New(),
		UserID:     userID,
		EntityID:   entityID,
		EntityType: entityType,
	}
	return r.DB.Create(&sub).Error
}

func (r *SubscriptionRepository) Unsubscribe(userID, entityID uuid.UUID) error {
	return r.DB.Where("user_id = ? AND entity_id = ?", userID, entityID).Delete(&models.Subscription{}).Error
}

func (r *SubscriptionRepository) IsSubscribed(userID, entityID uuid.UUID) (bool, error) {
	var count int64
	err := r.DB.Model(&models.Subscription{}).Where("user_id = ? AND entity_id = ?", userID, entityID).Count(&count).Error
	return count > 0, err
}

func (r *SubscriptionRepository) GetSubscribers(entityID uuid.UUID) ([]uuid.UUID, error) {
	var userIDs []uuid.UUID
	err := r.DB.Model(&models.Subscription{}).Where("entity_id = ?", entityID).Pluck("user_id", &userIDs).Error
	return userIDs, err
}

func (r *SubscriptionRepository) GetSubscribersForCard(cardID uuid.UUID) ([]uuid.UUID, error) {
	var card models.Card
	if err := r.DB.Preload("Column").First(&card, "id = ?", cardID).Error; err != nil {
		return nil, err
	}

	// Fetch all subscriptions for this card, its column, or its board
	entityIDs := []uuid.UUID{cardID, card.ColumnID, card.Column.BoardID}

	var userIDs []uuid.UUID
	err := r.DB.Model(&models.Subscription{}).
		Where("entity_id IN ?", entityIDs).
		Distinct("user_id").
		Pluck("user_id", &userIDs).Error

	// DEBUG: Print subscribers
	log.Printf("[SubscriptionRepo] GetSubscribersForCard: Found %d subscribers for card %s: %v", len(userIDs), cardID, userIDs)

	return userIDs, err
}
