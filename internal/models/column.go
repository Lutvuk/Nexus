package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Column struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	BoardID   uuid.UUID `gorm:"type:uuid;index" json:"board_id"` // Link to Board
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	Position  float64   `gorm:"not null" json:"position"`
	Cards     []Card    `gorm:"foreignKey:ColumnID;constraint:OnDelete:CASCADE" json:"cards"`
	CardCount int       `gorm:"-" json:"card_count"` // Computed field
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// BeforeCreate hook to generate UUID if not present
func (c *Column) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}
