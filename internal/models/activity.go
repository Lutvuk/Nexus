package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Activity struct {
	ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	BoardID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"board_id"` // For board-level filtering
	Action    string         `gorm:"size:50;not null" json:"action"`           // e.g., "moved_card", "commented", "invited"
	TargetID  uuid.UUID      `gorm:"type:uuid;index" json:"target_id"`         // ID of the object (CardID, ColumnID, etc.)
	Metadata  datatypes.JSON `json:"metadata"`                                 // Flexible JSON for details (e.g., {"from": "To Do", "to": "Done"})
	CreatedAt time.Time      `json:"created_at"`
}
