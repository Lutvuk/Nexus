package models

import (
	"time"

	"github.com/google/uuid"
)

type SubscriptionType string

const (
	SubscriptionCard   SubscriptionType = "CARD"
	SubscriptionColumn SubscriptionType = "COLUMN"
	SubscriptionBoard  SubscriptionType = "BOARD"
)

type Subscription struct {
	ID         uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	UserID     uuid.UUID        `json:"user_id" gorm:"type:uuid;not null;index:idx_user_entity,unique"`
	EntityID   uuid.UUID        `json:"entity_id" gorm:"type:uuid;not null;index:idx_user_entity,unique"`
	EntityType SubscriptionType `json:"entity_type" gorm:"type:varchar(20);not null"`
	CreatedAt  time.Time        `json:"created_at" gorm:"autoCreateTime"`
}
