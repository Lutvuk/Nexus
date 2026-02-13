package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Board struct {
	ID                 uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	WorkspaceID        uuid.UUID      `gorm:"type:uuid;index" json:"workspace_id"`
	Title              string         `gorm:"not null" json:"title"`
	BackgroundColor    string         `gorm:"type:varchar(50);default:'#1e293b'" json:"background_color"` // Default slate-800
	BackgroundImageURL string         `gorm:"type:text" json:"background_image_url"`
	DocumentationNotes string         `gorm:"type:text" json:"documentation_notes"`
	IsStarred          bool           `gorm:"default:false" json:"is_starred"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Columns      []Column      `gorm:"foreignKey:BoardID;constraint:OnDelete:CASCADE" json:"columns"`
	CustomFields []CustomField `gorm:"foreignKey:BoardID;constraint:OnDelete:CASCADE" json:"custom_fields,omitempty"`
}
