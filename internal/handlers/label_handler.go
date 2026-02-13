package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"nexus-backend/internal/models"
	"nexus-backend/internal/realtime"
)

type LabelHandler struct {
	DB  *gorm.DB
	Hub *realtime.Hub
}

func NewLabelHandler(db *gorm.DB, hub *realtime.Hub) *LabelHandler {
	return &LabelHandler{DB: db, Hub: hub}
}

func (h *LabelHandler) broadcastBoardUpdate(boardID string) {
	if h.Hub == nil {
		return
	}
	h.Hub.BroadcastToRoom(boardID, "BOARD_UPDATED", map[string]interface{}{
		"board_id": boardID,
	})
}

// GetBoardLabels returns all labels for a board
func (h *LabelHandler) GetBoardLabels(c *gin.Context) {
	boardID := c.Param("id")
	if _, err := uuid.Parse(boardID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var labels []models.Label
	if err := h.DB.Where("board_id = ?", boardID).Find(&labels).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch labels"})
		return
	}

	c.JSON(http.StatusOK, labels)
}

// CreateLabel creates a new label for a board
func (h *LabelHandler) CreateLabel(c *gin.Context) {
	boardID := c.Param("id")
	if _, err := uuid.Parse(boardID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var req struct {
		Name  string `json:"name" binding:"required"`
		Color string `json:"color" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	label := models.Label{
		BoardID: uuid.MustParse(boardID),
		Name:    req.Name,
		Color:   req.Color,
	}

	if err := h.DB.Create(&label).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create label"})
		return
	}

	h.broadcastBoardUpdate(boardID)
	c.JSON(http.StatusCreated, label)
}

// UpdateLabel updates a label
func (h *LabelHandler) UpdateLabel(c *gin.Context) {
	labelID := c.Param("id")

	var label models.Label
	if err := h.DB.First(&label, "id = ?", labelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Label not found"})
		return
	}

	var req struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		label.Name = req.Name
	}
	if req.Color != "" {
		label.Color = req.Color
	}

	if err := h.DB.Save(&label).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update label"})
		return
	}

	h.broadcastBoardUpdate(label.BoardID.String())
	c.JSON(http.StatusOK, label)
}

// DeleteLabel deletes a label (and removes relations via GORM)
func (h *LabelHandler) DeleteLabel(c *gin.Context) {
	labelID := c.Param("id")

	if err := h.DB.Delete(&models.Label{}, "id = ?", labelID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete label"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
