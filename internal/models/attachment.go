package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Attachment struct {
	ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CardID    uuid.UUID      `gorm:"type:uuid;not null" json:"card_id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	Filename  string         `gorm:"not null" json:"filename"`
	FilePath  string         `gorm:"not null" json:"file_path"`
	FileType  string         `gorm:"not null" json:"file_type"` // e.g. "image/png", "application/pdf"
	Size      int64          `gorm:"not null" json:"size"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
