package models

import (
	"time"

	"github.com/google/uuid"
)

type EmailVerification struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID     uuid.UUID  `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
	Email      string     `gorm:"index;not null" json:"email"`
	Code       string     `gorm:"size:6;not null" json:"-"`
	ExpiresAt  time.Time  `gorm:"not null" json:"expires_at"`
	VerifiedAt *time.Time `json:"verified_at"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}
