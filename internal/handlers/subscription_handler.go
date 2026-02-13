package handlers

import (
	"net/http"
	"nexus-backend/internal/middleware"
	"nexus-backend/internal/models"
	"nexus-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SubscriptionHandler struct {
	Service *services.SubscriptionService
}

func NewSubscriptionHandler(service *services.SubscriptionService) *SubscriptionHandler {
	return &SubscriptionHandler{Service: service}
}

func (h *SubscriptionHandler) Subscribe(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	entityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	entityType := c.Query("type")
	if entityType == "" {
		entityType = "CARD" // Default
	}

	if err := h.Service.Subscribe(userID, entityID, models.SubscriptionType(entityType)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to subscribe"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Subscribed successfully"})
}

func (h *SubscriptionHandler) Unsubscribe(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	entityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	if err := h.Service.Unsubscribe(userID, entityID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unsubscribe"})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *SubscriptionHandler) Status(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	entityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	isSubscribed, err := h.Service.IsSubscribed(userID, entityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get subscription status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"is_subscribed": isSubscribed})
}
