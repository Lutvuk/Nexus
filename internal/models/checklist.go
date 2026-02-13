package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Checklist struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	CardID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"card_id"`
	Title     string         `gorm:"type:varchar(200);not null" json:"title"`
	Position  float64        `gorm:"not null" json:"position"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Items []ChecklistItem `gorm:"foreignKey:ChecklistID;constraint:OnDelete:CASCADE" json:"items"`
}

type ChecklistItem struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ChecklistID uuid.UUID      `gorm:"type:uuid;not null;index" json:"checklist_id"`
	Title       string         `gorm:"type:varchar(500);not null" json:"title"`
	IsCompleted bool           `gorm:"default:false" json:"is_completed"`
	Position    float64        `gorm:"not null" json:"position"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hooks
func (c *Checklist) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}

func (i *ChecklistItem) BeforeCreate(tx *gorm.DB) (err error) {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return
}
