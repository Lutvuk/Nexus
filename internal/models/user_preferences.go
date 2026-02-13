package models

import "github.com/google/uuid"

// UserPreferences stores per-user notification and accessibility settings
type UserPreferences struct {
	UserID uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`

	// Email Notification Preferences
	NotifyComments        bool `gorm:"default:true" json:"notify_comments"`
	NotifyDueDates        bool `gorm:"default:true" json:"notify_due_dates"`
	NotifyRemovedFromCard bool `gorm:"default:true" json:"notify_removed_from_card"`
	NotifyAttachments     bool `gorm:"default:true" json:"notify_attachments"`
	NotifyCardCreated     bool `gorm:"default:true" json:"notify_card_created"`
	NotifyCardMoved       bool `gorm:"default:true" json:"notify_card_moved"`
	NotifyCardArchived    bool `gorm:"default:true" json:"notify_card_archived"`

	// Desktop Notifications
	AllowDesktopNotifications bool `gorm:"default:false" json:"allow_desktop_notifications"`

	// Accessibility
	ColorBlindMode           bool `gorm:"default:false" json:"color_blind_mode"`
	DisableKeyboardShortcuts bool `gorm:"default:false" json:"disable_keyboard_shortcuts"`

	// Other Preferences
	EnableSuggestions bool `gorm:"default:true" json:"enable_suggestions"`
	MarketingEmails   bool `gorm:"default:false" json:"marketing_emails"`
	CookieAnalytics   bool `gorm:"default:true" json:"cookie_analytics"`

	// Relation
	User User `gorm:"foreignKey:UserID" json:"-"`
}
