package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"nexus-backend/internal/services"
)

type ActivityHandler struct {
	Service *services.ActivityService
}

func NewActivityHandler(service *services.ActivityService) *ActivityHandler {
	return &ActivityHandler{Service: service}
}

func (h *ActivityHandler) GetBoardActivity(c *gin.Context) {
	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	limitQuery := c.DefaultQuery("limit", "20")
	limit, _ := strconv.Atoi(limitQuery)

	activities, err := h.Service.GetBoardActivity(boardID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activities"})
		return
	}

	c.JSON(http.StatusOK, activities)
}

func (h *ActivityHandler) GetCardActivity(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	activities, err := h.Service.GetCardActivity(cardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activities"})
		return
	}

	c.JSON(http.StatusOK, activities)
}
