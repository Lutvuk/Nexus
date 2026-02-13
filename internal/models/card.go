package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Card struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Title        string     `gorm:"type:varchar(200);not null" json:"title"`
	Description  string     `gorm:"type:text" json:"description"`
	ColumnID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"column_id"`
	Position     float64    `gorm:"not null;index" json:"position"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	IsArchived   bool       `json:"is_archived" gorm:"default:false"`
	ArchivedAt   *time.Time `json:"archived_at"`
	IsTemplate   bool       `json:"is_template" gorm:"default:false"`
	TemplateName string     `json:"template_name" gorm:"type:varchar(100)"`

	// Relations
	Checklists        []Checklist            `gorm:"foreignKey:CardID;constraint:OnDelete:CASCADE" json:"checklists"`
	Comments          []Comment              `gorm:"foreignKey:CardID;constraint:OnDelete:CASCADE" json:"comments"`
	CustomFieldValues []CardCustomFieldValue `gorm:"foreignKey:CardID;constraint:OnDelete:CASCADE" json:"custom_field_values,omitempty"`
	Column            Column                 `gorm:"foreignKey:ColumnID" json:"column,omitempty"` // Belongs to Column (for BoardID access)

	// Metadata
	DueDate    *time.Time `json:"due_date"` // Optional
	IsComplete bool       `json:"is_complete" gorm:"default:false"`

	// Many-to-Many
	Labels  []Label `gorm:"many2many:card_labels;" json:"labels"`
	Members []User  `gorm:"many2many:card_members;" json:"members"`

	// Attachments
	CoverAttachmentID *uuid.UUID   `json:"cover_attachment_id"`
	Attachments       []Attachment `gorm:"foreignKey:CardID;constraint:OnDelete:CASCADE" json:"attachments"`
}

// BeforeCreate hook to generate UUID if not present
func (c *Card) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}
