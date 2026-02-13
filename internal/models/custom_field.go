package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type CustomFieldType string

const (
	FieldTypeText     CustomFieldType = "text"
	FieldTypeNumber   CustomFieldType = "number"
	FieldTypeDate     CustomFieldType = "date"
	FieldTypeDropdown CustomFieldType = "dropdown"
	FieldTypeCheckbox CustomFieldType = "checkbox"
)

type CustomField struct {
	ID        uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	BoardID   uuid.UUID       `gorm:"type:uuid;not null;index" json:"board_id"`
	Name      string          `gorm:"type:varchar(100);not null" json:"name"`
	Type      CustomFieldType `gorm:"type:varchar(20);not null" json:"type"`
	Options   pq.StringArray  `gorm:"type:text[]" json:"options,omitempty"` // For dropdowns
	Position  float64         `gorm:"type:double precision;not null;default:0;index" json:"position"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type CardCustomFieldValue struct {
	ID            uuid.UUID   `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CardID        uuid.UUID   `gorm:"type:uuid;not null;index" json:"card_id"`
	CustomFieldID uuid.UUID   `gorm:"type:uuid;not null;index" json:"custom_field_id"`
	CustomField   CustomField `gorm:"foreignKey:CustomFieldID" json:"custom_field,omitempty"`

	// Value storage (one of these will be set based on Type)
	ValueText   string     `gorm:"type:text" json:"value_text,omitempty"`
	ValueNumber float64    `gorm:"type:double precision" json:"value_number,omitempty"`
	ValueDate   *time.Time `gorm:"type:timestamp" json:"value_date,omitempty"`
	ValueBool   bool       `gorm:"type:boolean" json:"value_bool,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
