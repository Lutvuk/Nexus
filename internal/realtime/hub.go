package realtime

import (
	"sync"
)

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients, grouped by Room ID.
	// map[RoomID]map[*Client]bool
	rooms map[string]map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan Message

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	mu sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		rooms:      make(map[string]map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			// Register client in ALL of its rooms
			for _, roomID := range client.Rooms {
				if h.rooms[roomID] == nil {
					h.rooms[roomID] = make(map[*Client]bool)
				}
				h.rooms[roomID][client] = true
			}
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			// Unregister client from ALL of its rooms
			for _, roomID := range client.Rooms {
				if _, ok := h.rooms[roomID]; ok {
					if _, ok := h.rooms[roomID][client]; ok {
						delete(h.rooms[roomID], client)
						if len(h.rooms[roomID]) == 0 {
							delete(h.rooms, roomID)
						}
					}
				}
			}
			close(client.send)
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.Lock()
			if clients, ok := h.rooms[message.BoardID]; ok {
				for client := range clients {
					select {
					case client.send <- message:
					default:
						// Remove unresponsive client from all rooms
						for _, roomID := range client.Rooms {
							delete(h.rooms[roomID], client)
							if len(h.rooms[roomID]) == 0 {
								delete(h.rooms, roomID)
							}
						}
						close(client.send)
					}
				}
			}
			h.mu.Unlock()
		}
	}
}

// BroadcastToRoom sends a message to all clients in a specific board room
func (h *Hub) BroadcastToRoom(boardID string, msgType string, payload interface{}) {
	msg := Message{
		Type:    msgType,
		Payload: payload,
		BoardID: boardID,
	}
	h.broadcast <- msg
}

// BroadcastToUser sends a message to a specific user's notification room
func (h *Hub) BroadcastToUser(userID string, msgType string, payload interface{}) {
	roomID := "user:" + userID
	msg := Message{
		Type:    msgType,
		Payload: payload,
		BoardID: roomID, // Reusing BoardID field for room routing
	}
	h.broadcast <- msg
}
