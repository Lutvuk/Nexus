package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Label struct {
	ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	BoardID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"board_id"`
	Name      string         `gorm:"not null" json:"name"`
	Color     string         `gorm:"not null" json:"color"` // Hex code e.g. #FF0000
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
