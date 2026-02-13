package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// InviteLink represents a shareable invitation link for a workspace
type InviteLink struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	WorkspaceID uuid.UUID  `gorm:"type:uuid;not null" json:"workspace_id"`
	Token       string     `gorm:"uniqueIndex;size:64" json:"token"` // Random token for URL
	CreatedBy   uuid.UUID  `gorm:"type:uuid" json:"created_by"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`      // Optional expiration
	MaxUses     int        `gorm:"default:0" json:"max_uses"` // 0 = unlimited
	UsesCount   int        `gorm:"default:0" json:"uses_count"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Relationships
	Workspace Workspace `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	Creator   User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

func (i *InviteLink) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

// IsValid checks if the invite link is still valid (not expired, not maxed out)
func (i *InviteLink) IsValid() bool {
	if i.ExpiresAt != nil && time.Now().After(*i.ExpiresAt) {
		return false
	}
	if i.MaxUses > 0 && i.UsesCount >= i.MaxUses {
		return false
	}
	return true
}
