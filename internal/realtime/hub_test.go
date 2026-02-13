package realtime

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestHub_BroadcastToRoom(t *testing.T) {
	// 1. Setup Hub
	hub := NewHub()
	go hub.Run()

	// 2. Create Clients with buffered channels
	// Client A in Room 1
	clientA := &Client{
		hub:    hub,
		send:   make(chan Message, 10),
		Rooms:  []string{"room1"},
		UserID: "userA",
	}
	hub.register <- clientA

	// Client B in Room 1
	clientB := &Client{
		hub:    hub,
		send:   make(chan Message, 10),
		Rooms:  []string{"room1"},
		UserID: "userB",
	}
	hub.register <- clientB

	// Client C in Room 2
	clientC := &Client{
		hub:    hub,
		send:   make(chan Message, 10),
		Rooms:  []string{"room2"},
		UserID: "userC",
	}
	hub.register <- clientC

	// Allow time for registration processing
	time.Sleep(50 * time.Millisecond)

	// 3. Action: Broadcast to Room 1
	hub.BroadcastToRoom("room1", "TEST_EVENT", map[string]string{"foo": "bar"})

	// 4. Verification

	// Client A should receive
	select {
	case msg := <-clientA.send:
		assert.Equal(t, "TEST_EVENT", msg.Type)
		assert.Equal(t, "room1", msg.BoardID)
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Client A did not receive message")
	}

	// Client B should receive
	select {
	case msg := <-clientB.send:
		assert.Equal(t, "TEST_EVENT", msg.Type)
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Client B did not receive message")
	}

	// Client C should NOT receive
	select {
	case <-clientC.send:
		t.Fatal("Client C received message intended for Room 1")
	case <-time.After(50 * time.Millisecond):
		// Success
	}
}

func TestHub_Unregister(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	client := &Client{
		hub:   hub,
		send:  make(chan Message, 10),
		Rooms: []string{"room1"},
	}
	hub.register <- client
	time.Sleep(10 * time.Millisecond)

	// Unregister
	hub.unregister <- client
	time.Sleep(10 * time.Millisecond)

	// Broadcast
	hub.BroadcastToRoom("room1", "MSG", nil)

	select {
	case _, ok := <-client.send:
		if ok {
			t.Fatal("Client received message after unregister")
		}
		// if !ok, channel is closed, which is expected behavior
	case <-time.After(50 * time.Millisecond):
		// If channel is closed, this might not be reached
	}
}

func TestHub_MultiRoom(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	// Client in BOTH room1 and user:userA (simulating board + notification room)
	client := &Client{
		hub:    hub,
		send:   make(chan Message, 10),
		Rooms:  []string{"room1", "user:userA"},
		UserID: "userA",
	}
	hub.register <- client
	time.Sleep(50 * time.Millisecond)

	// Broadcast to board room
	hub.BroadcastToRoom("room1", "BOARD_EVENT", nil)
	select {
	case msg := <-client.send:
		assert.Equal(t, "BOARD_EVENT", msg.Type)
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Client did not receive board room message")
	}

	// Broadcast to user notification room
	hub.BroadcastToUser("userA", "NOTIFICATION_RECEIVED", map[string]string{"title": "test"})
	select {
	case msg := <-client.send:
		assert.Equal(t, "NOTIFICATION_RECEIVED", msg.Type)
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Client did not receive user notification")
	}
}
