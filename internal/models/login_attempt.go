package models

import "time"

type LoginAttempt struct {
	Key         string     `gorm:"primaryKey;size:400" json:"-"`
	IP          string     `gorm:"size:64;index;not null" json:"-"`
	Email       string     `gorm:"size:255;index;not null" json:"-"`
	Failures    int        `gorm:"not null;default:0" json:"-"`
	LockedUntil *time.Time `gorm:"index" json:"-"`
	CreatedAt   time.Time  `json:"-"`
	UpdatedAt   time.Time  `json:"-"`
}
