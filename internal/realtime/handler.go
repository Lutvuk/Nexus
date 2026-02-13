package realtime

import (
	"log"
	"net/http"
	"nexus-backend/internal/repository"
	"nexus-backend/pkg/auth"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ServeWs handles websocket requests from the peer.
func ServeWs(hub *Hub, db *gorm.DB, c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
		return
	}

	claims, err := auth.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	boardID := c.Query("board_id")
	userRoom := "user:" + claims.UserID.String()

	// Build list of rooms for this client
	var rooms []string

	// Always join the user's notification room
	rooms = append(rooms, userRoom)

	// If a board_id is provided, validate access and join the board room
	if boardID != "" {
		parsedBoardID, err := uuid.Parse(boardID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
			return
		}

		boardRepo := repository.NewBoardRepository(db)
		if _, err := boardRepo.GetBoardByID(parsedBoardID, claims.UserID); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to board"})
			return
		}

		rooms = append(rooms, boardID)
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := &Client{
		hub:    hub,
		conn:   conn,
		send:   make(chan Message, 256),
		UserID: claims.UserID.String(),
		Rooms:  rooms,
	}
	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}
