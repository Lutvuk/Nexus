package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WorkspaceMember represents the many-to-many relationship with role
type WorkspaceMember struct {
	WorkspaceID uuid.UUID `gorm:"type:uuid;primaryKey" json:"workspace_id"`
	UserID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
	Role        string    `gorm:"type:varchar(50);default:'member'" json:"role"`    // 'owner', 'admin', 'member'
	Status      string    `gorm:"type:varchar(20);default:'pending'" json:"status"` // 'pending', 'accepted', 'declined', 'requested'
	AddedAt     time.Time `json:"added_at"`

	// Relations
	Workspace Workspace `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// BeforeCreate hooks
func (wm *WorkspaceMember) BeforeCreate(tx *gorm.DB) (err error) {
	if wm.AddedAt.IsZero() {
		wm.AddedAt = time.Now()
	}
	return
}
