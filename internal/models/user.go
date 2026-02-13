package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID                     uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Email                  string         `gorm:"uniqueIndex;not null" json:"email"`
	Password               string         `gorm:"not null" json:"-"` // Never return password
	Name                   string         `json:"name"`
	Username               string         `gorm:"uniqueIndex" json:"username"`
	Bio                    string         `json:"bio"`
	AvatarURL              string         `json:"avatar_url"`
	Language               string         `gorm:"default:'en'" json:"language"`
	EmailVerified          bool           `gorm:"-" json:"email_verified"`
	HasCompletedOnboarding bool           `gorm:"default:false" json:"has_completed_onboarding"`
	CreatedAt              time.Time      `json:"created_at"`
	UpdatedAt              time.Time      `json:"updated_at"`
	DeletedAt              gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Workspaces       []Workspace `gorm:"foreignKey:OwnerID" json:"workspaces"`
	SharedWorkspaces []Workspace `gorm:"many2many:workspace_members;" json:"shared_workspaces"`
}

type Workspace struct {
	ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"not null" json:"name"`
	OwnerID   uuid.UUID      `gorm:"type:uuid;not null" json:"owner_id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Owner   User              `gorm:"foreignKey:OwnerID" json:"owner"`
	Boards  []Board           `gorm:"foreignKey:WorkspaceID" json:"boards"`
	Members []WorkspaceMember `gorm:"foreignKey:WorkspaceID" json:"members"`
}
