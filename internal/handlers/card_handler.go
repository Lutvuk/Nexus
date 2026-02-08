package handlers

import (
	"net/http"
	"nexus-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CardHandler struct {
	Service *services.CardService
}

func NewCardHandler(service *services.CardService) *CardHandler {
	return &CardHandler{Service: service}
}

type CreateCardRequest struct {
	Title       string `json:"title" binding:"required,min=3,max=200"`
	Description string `json:"description"`
}

func (h *CardHandler) Create(c *gin.Context) {
	columnIDStr := c.Param("id") // column_id from URL
	columnID, err := uuid.Parse(columnIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid column ID"})
		return
	}

	var req CreateCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Title required (3-200 characters)",
			"code":  "VALIDATION_ERROR",
			"field": "title",
		})
		return
	}

	card, err := h.Service.CreateCard(req.Title, req.Description, columnID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create card"})
		return
	}

	c.JSON(http.StatusCreated, card)
}

type UpdateCardRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

func (h *CardHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var req UpdateCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	card, err := h.Service.UpdateCard(id, req.Title, req.Description)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	c.JSON(http.StatusOK, card)
}

func (h *CardHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	if err := h.Service.DeleteCard(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	c.Status(http.StatusNoContent)
}

type MoveCardRequest struct {
	ColumnID uuid.UUID `json:"column_id" binding:"required"`
	Position int       `json:"position" binding:"min=0"`
}

func (h *CardHandler) Move(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var req MoveCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
		return
	}

	card, err := h.Service.MoveCard(id, req.ColumnID, req.Position)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Move failed (Concurrent modification or invalid target)",
			"code":  "CONFLICT",
			"retry": true,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"moved_card": card,
	})
}
