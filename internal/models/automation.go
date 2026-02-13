package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type TriggerType string

const (
	TriggerCardMoved      TriggerType = "CARD_MOVED"
	TriggerCardCreated    TriggerType = "CARD_CREATED"
	TriggerLabelAdded     TriggerType = "LABEL_ADDED"
	TriggerMemberAdded    TriggerType = "MEMBER_ADDED"
	TriggerChecklistDone  TriggerType = "CHECKLIST_DONE"
	TriggerCardCompleted  TriggerType = "CARD_COMPLETED"
	TriggerDueDateSet     TriggerType = "DUE_DATE_SET"
	TriggerCalendarSet    TriggerType = "CALENDAR_DATE_SET"
	TriggerDueDateOverdue TriggerType = "DUE_DATE_OVERDUE"
)

type ActionType string

const (
	ActionMoveCard        ActionType = "MOVE_CARD"
	ActionAddLabel        ActionType = "ADD_LABEL"
	ActionSetComplete     ActionType = "SET_COMPLETE"
	ActionAssignMember    ActionType = "ASSIGN_MEMBER"
	ActionArchiveCard     ActionType = "ARCHIVE_CARD"
	ActionSetDueDate      ActionType = "SET_DUE_DATE"
	ActionNotifyAssignees ActionType = "NOTIFY_ASSIGNEES"
	ActionNotifyAdmins    ActionType = "NOTIFY_ADMINS"
)

type AutomationRule struct {
	ID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	BoardID uuid.UUID `gorm:"type:uuid;not null;index" json:"board_id"`
	Board   *Board    `gorm:"foreignKey:BoardID;constraint:OnDelete:CASCADE" json:"-"`

	Name     string `gorm:"size:255;not null" json:"name"`
	IsActive bool   `gorm:"default:true" json:"is_active"`

	TriggerType TriggerType    `gorm:"size:50;not null" json:"trigger_type"`
	Conditions  datatypes.JSON `json:"conditions"` // e.g., { "from_column_id": "...", "to_column_id": "..." }

	ActionType   ActionType     `gorm:"size:50;not null" json:"action_type"`
	ActionParams datatypes.JSON `json:"action_params"` // e.g., { "target_column_id": "...", "label_id": "..." }

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
