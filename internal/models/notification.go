package models

import (
	"time"

	"github.com/google/uuid"
)

type NotificationType string

const (
	NotificationAssignment NotificationType = "ASSIGNMENT"
	NotificationMention    NotificationType = "MENTION"
	NotificationDueSoon    NotificationType = "DUE_SOON"
)

type Notification struct {
	ID         uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	UserID     uuid.UUID        `json:"user_id" gorm:"type:uuid;not null;index"`
	ActorID    *uuid.UUID       `json:"actor_id" gorm:"type:uuid"`
	Actor      *User            `json:"actor" gorm:"foreignKey:ActorID"`
	Type       NotificationType `json:"type" gorm:"not null"`
	Title      string           `json:"title" gorm:"not null"`
	Message    string           `json:"message" gorm:"not null"`
	EntityID   uuid.UUID        `json:"entity_id" gorm:"type:uuid;not null"`
	EntityType string           `json:"entity_type" gorm:"not null"` // "CARD", "BOARD"
	BoardID    *uuid.UUID       `json:"board_id" gorm:"type:uuid;index"`
	IsRead     bool             `json:"is_read" gorm:"default:false"`
	CreatedAt  time.Time        `json:"created_at" gorm:"autoCreateTime"`
}
