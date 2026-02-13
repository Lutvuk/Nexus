package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type BoardTemplate struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Category    string         `gorm:"size:100" json:"category"`
	Data        datatypes.JSON `gorm:"type:jsonb;not null" json:"data"` // e.g., { "columns": [{ "name": "To Do", "position": 1 }, ...], "labels": [...] }
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}
