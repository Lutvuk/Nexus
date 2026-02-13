package handlers

import (
	"net/http"
	"nexus-backend/internal/models"
	"nexus-backend/internal/realtime"
	"nexus-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ChecklistHandler struct {
	DB                  *gorm.DB
	Hub                 *realtime.Hub
	NotificationService *services.NotificationService
	SubscriptionService *services.SubscriptionService
	AutomationService   *services.AutomationService
}

func NewChecklistHandler(db *gorm.DB, hub *realtime.Hub, notificationService *services.NotificationService, subService *services.SubscriptionService, automationService *services.AutomationService) *ChecklistHandler {
	return &ChecklistHandler{
		DB:                  db,
		Hub:                 hub,
		NotificationService: notificationService,
		SubscriptionService: subService,
		AutomationService:   automationService,
	}
}

// Helper to notify watchers of card changes
func (h *ChecklistHandler) notifyWatchers(cardID uuid.UUID, actorID uuid.UUID, title, message string) {
	if h.SubscriptionService == nil || h.NotificationService == nil {
		return
	}

	subscribers, err := h.SubscriptionService.GetCardRelatedSubscribers(cardID)
	if err != nil {
		return
	}

	h.NotificationService.NotifySubscribers(subscribers, actorID, models.NotificationMention, title, message, cardID, "CARD", "")
}

// Helper to broadcast update
func (h *ChecklistHandler) broadcastCardUpdate(cardID uuid.UUID) {
	if h.Hub == nil {
		return
	}
	// Need to find BoardID for the card to broadcast to the room
	var card models.Card
	if err := h.DB.Preload("Column").First(&card, "id = ?", cardID).Error; err == nil {
		h.Hub.BroadcastToRoom(card.Column.BoardID.String(), "CARD_UPDATED", map[string]interface{}{
			"card_id":  card.ID.String(),
			"board_id": card.Column.BoardID.String(),
		})
	}
}

// CreateChecklist adds a new checklist to a card
func (h *ChecklistHandler) CreateChecklist(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var req struct {
		Title string `json:"title" binding:"required,min=1,max=200"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}

	// Calculate position using midpoint algorithm
	var maxPos float64
	h.DB.Model(&models.Checklist{}).Where("card_id = ?", cardID).
		Select("COALESCE(MAX(position), 0)").Scan(&maxPos)

	checklist := models.Checklist{
		CardID:   cardID,
		Title:    req.Title,
		Position: maxPos + 16384.0,
	}

	if err := h.DB.Create(&checklist).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create checklist"})
		return
	}

	h.broadcastCardUpdate(cardID)

	// Notify Subscribers
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		h.notifyWatchers(cardID, userID, "Checklist Added", "A new checklist was added to a card you are watching")
	}

	c.JSON(http.StatusCreated, checklist)
}

// DeleteChecklist removes a checklist and its items
func (h *ChecklistHandler) DeleteChecklist(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid checklist ID"})
		return
	}

	// Make sure to get CardID before deleting for broadcast
	var checklist models.Checklist
	if err := h.DB.First(&checklist, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Checklist not found"})
		return
	}

	if err := h.DB.Delete(&models.Checklist{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete checklist"})
		return
	}

	h.broadcastCardUpdate(checklist.CardID)
	c.JSON(http.StatusNoContent, nil)
}

// MoveChecklist updates the position of a checklist
func (h *ChecklistHandler) MoveChecklist(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid checklist ID"})
		return
	}

	var req struct {
		Position float64 `json:"position" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Position is required"})
		return
	}

	var checklist models.Checklist
	if err := h.DB.First(&checklist, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Checklist not found"})
		return
	}

	checklist.Position = req.Position
	if err := h.DB.Save(&checklist).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to move checklist"})
		return
	}

	h.broadcastCardUpdate(checklist.CardID)
	c.JSON(http.StatusOK, checklist)
}

// CreateChecklistItem adds an item to a checklist
func (h *ChecklistHandler) CreateItem(c *gin.Context) {
	checklistID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid checklist ID"})
		return
	}

	var req struct {
		Title string `json:"title" binding:"required,min=1,max=500"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}

	// Calculate position
	var maxPos float64
	h.DB.Model(&models.ChecklistItem{}).Where("checklist_id = ?", checklistID).
		Select("COALESCE(MAX(position), 0)").Scan(&maxPos)

	item := models.ChecklistItem{
		ChecklistID: checklistID,
		Title:       req.Title,
		Position:    maxPos + 16384.0,
		IsCompleted: false,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create item"})
		return
	}

	// Get CardID
	var checklist models.Checklist
	h.DB.First(&checklist, "id = ?", checklistID)
	h.broadcastCardUpdate(checklist.CardID)

	// Notify Subscribers
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		h.notifyWatchers(checklist.CardID, userID, "Checklist Item Added", "A new item was added to a checklist on a card you are watching")
	}

	c.JSON(http.StatusCreated, item)
}

// ToggleItem updates the completion status of a checklist item
func (h *ChecklistHandler) ToggleItem(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID"})
		return
	}

	var req struct {
		IsCompleted bool `json:"is_completed"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var item models.ChecklistItem
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	item.IsCompleted = req.IsCompleted
	if err := h.DB.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update item"})
		return
	}

	// Get CardID
	var checklist models.Checklist
	if err := h.DB.First(&checklist, "id = ?", item.ChecklistID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Checklist not found"})
		return
	}
	h.broadcastCardUpdate(checklist.CardID)

	if req.IsCompleted && h.AutomationService != nil {
		var total int64
		var incomplete int64
		h.DB.Model(&models.ChecklistItem{}).Where("checklist_id = ?", item.ChecklistID).Count(&total)
		h.DB.Model(&models.ChecklistItem{}).Where("checklist_id = ? AND is_completed = ?", item.ChecklistID, false).Count(&incomplete)

		if total > 0 && incomplete == 0 {
			var card models.Card
			if err := h.DB.Preload("Column").First(&card, "id = ?", checklist.CardID).Error; err == nil {
				ctx := map[string]interface{}{
					"card_id":      checklist.CardID.String(),
					"checklist_id": item.ChecklistID.String(),
				}
				h.AutomationService.EvaluateRules(card.Column.BoardID, models.TriggerChecklistDone, ctx)
			}
		}
	}

	// Notify Subscribers
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		status := "completed"
		if !item.IsCompleted {
			status = "uncompleted"
		}
		h.notifyWatchers(checklist.CardID, userID, "Checklist Item Updated", "An item was marked as "+status+" on a card you are watching")
	}

	c.JSON(http.StatusOK, item)
}

// MoveItem updates the position and/or checklist of an item
func (h *ChecklistHandler) MoveItem(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID"})
		return
	}

	var req struct {
		ChecklistID uuid.UUID `json:"checklist_id"`
		Position    float64   `json:"position" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Position is required"})
		return
	}

	var item models.ChecklistItem
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	oldChecklistID := item.ChecklistID
	item.Position = req.Position
	if req.ChecklistID != uuid.Nil {
		item.ChecklistID = req.ChecklistID
	}

	if err := h.DB.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to move item"})
		return
	}

	// Get CardID of old checklist
	var oldChecklist models.Checklist
	h.DB.First(&oldChecklist, "id = ?", oldChecklistID)
	h.broadcastCardUpdate(oldChecklist.CardID)

	// If moved to a different checklist, broadcast update for that card too
	if req.ChecklistID != uuid.Nil && req.ChecklistID != oldChecklistID {
		var newChecklist models.Checklist
		h.DB.First(&newChecklist, "id = ?", req.ChecklistID)
		if newChecklist.CardID != oldChecklist.CardID {
			h.broadcastCardUpdate(newChecklist.CardID)
		}
	}

	c.JSON(http.StatusOK, item)
}

// DeleteItem removes a checklist item
func (h *ChecklistHandler) DeleteItem(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID"})
		return
	}

	var item models.ChecklistItem
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	// Get CardID before delete
	var checklist models.Checklist
	h.DB.First(&checklist, "id = ?", item.ChecklistID)
	cardID := checklist.CardID

	if err := h.DB.Delete(&models.ChecklistItem{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete item"})
		return
	}

	h.broadcastCardUpdate(cardID)
	c.JSON(http.StatusNoContent, nil)
}
