package handlers

import (
	"net/http"
	"nexus-backend/internal/models"
	"nexus-backend/internal/realtime"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ColumnHandler struct {
	DB  *gorm.DB
	Hub *realtime.Hub
}

func NewColumnHandler(db *gorm.DB, hub *realtime.Hub) *ColumnHandler {
	return &ColumnHandler{DB: db, Hub: hub}
}

type CreateColumnRequest struct {
	Name    string `json:"name" binding:"required,min=1,max=100"`
	BoardID string `json:"board_id" binding:"required,uuid"`
}

type UpdateColumnRequest struct {
	Name string `json:"name" binding:"max=100"`
}

func (h *ColumnHandler) CreateColumn(c *gin.Context) {
	var req CreateColumnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Name (1-100 chars) and BoardID (UUID) are required",
			"code":    "VALIDATION_ERROR",
			"details": err.Error(),
		})
		return
	}

	boardID, _ := uuid.Parse(req.BoardID) // Validator ensures it's valid UUID

	// Find max position scoped to Board
	var maxPos float64
	var count int64
	h.DB.Model(&models.Column{}).Where("board_id = ?", boardID).Count(&count)
	if count > 0 {
		var result struct{ Max float64 }
		h.DB.Model(&models.Column{}).Where("board_id = ?", boardID).Select("MAX(position) as max").Scan(&result)
		maxPos = result.Max + 16384.0 // Large gap for reordering
	} else {
		maxPos = 16384.0
	}

	column := models.Column{
		Name:     req.Name,
		Position: maxPos,
		BoardID:  boardID,
	}

	if err := h.DB.Create(&column).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create column", "details": err.Error()})
		return
	}

	if h.Hub != nil {
		h.Hub.BroadcastToRoom(column.BoardID.String(), "COLUMN_CREATED", map[string]interface{}{
			"column_id": column.ID.String(),
			"board_id":  column.BoardID.String(),
		})
	}

	c.JSON(http.StatusCreated, column)
}

func (h *ColumnHandler) UpdateColumn(c *gin.Context) {
	id := c.Param("id")
	var req UpdateColumnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid input",
			"code":  "VALIDATION_ERROR",
		})
		return
	}

	var column models.Column
	if err := h.DB.First(&column, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Column not found",
			"code":  "NOT_FOUND",
		})
		return
	}

	if req.Name != "" {
		column.Name = req.Name
	}

	if err := h.DB.Save(&column).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update column"})
		return
	}

	if h.Hub != nil {
		h.Hub.BroadcastToRoom(column.BoardID.String(), "COLUMN_UPDATED", map[string]interface{}{
			"column_id": column.ID.String(),
			"board_id":  column.BoardID.String(),
		})
	}

	c.JSON(http.StatusOK, column)
}

func (h *ColumnHandler) DeleteColumn(c *gin.Context) {
	id := c.Param("id")

	var column models.Column
	if err := h.DB.First(&column, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Column not found",
			"code":  "NOT_FOUND",
		})
		return
	}

	result := h.DB.Delete(&models.Column{}, "id = ?", id)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete column"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Column not found",
			"code":  "NOT_FOUND",
		})
		return
	}

	if h.Hub != nil {
		h.Hub.BroadcastToRoom(column.BoardID.String(), "COLUMN_DELETED", map[string]interface{}{
			"column_id": column.ID.String(),
			"board_id":  column.BoardID.String(),
		})
	}

	c.Status(http.StatusNoContent)
}

type MoveColumnRequest struct {
	Position float64 `json:"position" binding:"min=0"`
}

func (h *ColumnHandler) MoveColumn(c *gin.Context) {
	id := c.Param("id")
	var req MoveColumnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid position"})
		return
	}

	var column models.Column

	// Transaction for safety
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&column, "id = ?", id).Error; err != nil {
			return err
		}

		if column.Position == req.Position {
			return nil
		}

		column.Position = req.Position
		return tx.Save(&column).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to move column", "details": err.Error()})
		return
	}

	// Broadcast to WebSocket clients
	if h.Hub != nil {
		h.Hub.BroadcastToRoom(column.BoardID.String(), "COLUMN_MOVED", map[string]interface{}{
			"column_id": column.ID.String(),
			"position":  req.Position,
		})
	}

	c.Status(http.StatusOK)
}
