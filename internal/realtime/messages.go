package realtime

// Message represents the standardized WebSocket payload
type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
	BoardID string      `json:"-"` // Internal use only (also used for user room: "user:<id>")
}

const (
	MessageTypeConnect            = "CONNECT"
	MessageTypeDisconnect         = "DISCONNECT"
	MessageTypeCardMoved          = "CARD_MOVED"
	MessageTypeCardUpdated        = "CARD_UPDATED"
	MessageTypeColumnMoved        = "COLUMN_MOVED"
	MessageTypePresenceUpdate     = "PRESENCE_UPDATE"
	MessageTypeInvitationReceived = "INVITATION_RECEIVED"
	MessageTypeRoleUpdated        = "ROLE_UPDATED"
)
