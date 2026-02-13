package handlers

import (
	"fmt"
	"net/http"

	"nexus-backend/internal/models"
	"nexus-backend/internal/realtime"
	"nexus-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CustomFieldHandler struct {
	Service *services.CustomFieldService
	DB      *gorm.DB
	Hub     *realtime.Hub
}

func NewCustomFieldHandler(service *services.CustomFieldService, db *gorm.DB, hub *realtime.Hub) *CustomFieldHandler {
	return &CustomFieldHandler{
		Service: service,
		DB:      db,
		Hub:     hub,
	}
}

// CreateField: POST /boards/:id/fields
func (h *CustomFieldHandler) CreateField(c *gin.Context) {
	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var req struct {
		Name    string                 `json:"name" binding:"required"`
		Type    models.CustomFieldType `json:"type" binding:"required"`
		Options []string               `json:"options"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	field, err := h.Service.CreateField(boardID, req.Name, req.Type, req.Options)
	if err != nil {
		fmt.Printf("[CustomFieldHandler] CreateField error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create field: " + err.Error()})
		return
	}

	if h.Hub != nil {
		h.Hub.BroadcastToRoom(boardID.String(), "BOARD_UPDATED", map[string]interface{}{
			"board_id": boardID.String(),
		})
	}

	c.JSON(http.StatusCreated, field)
}

// GetFields: GET /boards/:id/fields
func (h *CustomFieldHandler) GetFields(c *gin.Context) {
	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	fields, err := h.Service.GetFields(boardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch fields"})
		return
	}

	c.JSON(http.StatusOK, fields)
}

// DeleteField: DELETE /fields/:id
func (h *CustomFieldHandler) DeleteField(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid field ID"})
		return
	}

	var field models.CustomField
	if h.Hub != nil {
		_ = h.DB.First(&field, "id = ?", id).Error
	}

	if err := h.Service.DeleteField(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete field"})
		return
	}

	if h.Hub != nil && field.BoardID != uuid.Nil {
		h.Hub.BroadcastToRoom(field.BoardID.String(), "BOARD_UPDATED", map[string]interface{}{
			"board_id": field.BoardID.String(),
		})
	}

	c.Status(http.StatusNoContent)
}

// SetValue: POST /cards/:id/fields/:field_id
func (h *CustomFieldHandler) SetValue(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	fieldID, err := uuid.Parse(c.Param("field_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid field ID"})
		return
	}

	var req struct {
		Value interface{} `json:"value"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	val, err := h.Service.SetCardValue(cardID, fieldID, req.Value)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.Hub != nil {
		var card models.Card
		if err := h.DB.Preload("Column").First(&card, "id = ?", cardID).Error; err == nil {
			h.Hub.BroadcastToRoom(card.Column.BoardID.String(), "CARD_UPDATED", map[string]interface{}{
				"card_id":  card.ID.String(),
				"board_id": card.Column.BoardID.String(),
			})
		}
	}

	c.JSON(http.StatusOK, val)
}

// GetValues: GET /cards/:id/fields
func (h *CustomFieldHandler) GetValues(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	values, err := h.Service.GetCardValues(cardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch values"})
		return
	}

	c.JSON(http.StatusOK, values)
}
