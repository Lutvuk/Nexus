package handlers

import (
	"net/http"
	models "nexus-backend/internal/models"
	"nexus-backend/internal/realtime"
	"nexus-backend/internal/services"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var mentionIDPattern = regexp.MustCompile(`mention:([0-9a-fA-F-]{36})`)
var mentionTextPattern = regexp.MustCompile(`(?:^|\s)@([a-zA-Z0-9._-]{2,50})`)

type CardHandler struct {
	Service             *services.CardService
	ActivityService     *services.ActivityService
	NotificationService *services.NotificationService
	SubscriptionService *services.SubscriptionService
	Hub                 *realtime.Hub
}

func NewCardHandler(service *services.CardService, activityService *services.ActivityService, notificationService *services.NotificationService, subService *services.SubscriptionService, hub *realtime.Hub) *CardHandler {
	return &CardHandler{
		Service:             service,
		ActivityService:     activityService,
		NotificationService: notificationService,
		SubscriptionService: subService,
		Hub:                 hub,
	}
}

type CreateCardRequest struct {
	Title       string     `json:"title" binding:"required,min=3,max=200"`
	Description string     `json:"description"`
	TemplateID  *uuid.UUID `json:"template_id"`
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

	var card *models.Card
	if req.TemplateID != nil {
		// Create from Template
		card, err = h.Service.CopyCard(*req.TemplateID, columnID)
		if err == nil && req.Title != "" {
			card, err = h.Service.UpdateCard(card.ID, req.Title, "", nil, nil)
		}
	} else {
		// Standard creation
		card, err = h.Service.CreateCard(req.Title, req.Description, columnID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create card"})
		return
	}

	// Re-fetch with preloaded relations so Column.BoardID is available
	fullCard, fetchErr := h.Service.GetCardByID(card.ID)
	if fetchErr == nil {
		card = fullCard
	}

	// Broadcast to target board
	if h.Hub != nil {
		h.Hub.BroadcastToRoom(card.Column.BoardID.String(), "CARD_CREATED", map[string]interface{}{
			"board_id":  card.Column.BoardID.String(),
			"column_id": columnID.String(),
			"card":      card,
		})
	}

	// Log Activity
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		h.ActivityService.LogActivity(userID, card.Column.BoardID, "created_card", card.ID, map[string]interface{}{
			"card_title":  card.Title,
			"column_id":   columnID,
			"is_template": req.TemplateID != nil,
		})

		if h.SubscriptionService != nil && h.NotificationService != nil {
			boardSubscribers, err := h.SubscriptionService.GetSubscribers(card.Column.BoardID)
			if err == nil {
				h.NotificationService.NotifySubscribers(
					boardSubscribers,
					userID,
					models.NotificationMention,
					"Card Created",
					"A new card was created: "+card.Title,
					card.ID,
					"CARD",
					services.PrefNotifyCardCreated,
				)
			}
		}
	}

	c.JSON(http.StatusCreated, card)
}

// GetByID returns a card with all its checklists and items
func (h *CardHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	card, err := h.Service.GetCardByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	c.JSON(http.StatusOK, card)
}

type UpdateCardRequest struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	DueDate     *time.Time `json:"due_date"`
	IsComplete  *bool      `json:"is_complete"`
}

// Helper to broadcast update
func (h *CardHandler) broadcastCardUpdate(cardID uuid.UUID) {
	if h.Hub == nil {
		return
	}
	// Need to find BoardID for the card to broadcast to the room
	card, err := h.Service.GetCardByID(cardID)
	if err == nil {
		h.Hub.BroadcastToRoom(card.Column.BoardID.String(), "CARD_UPDATED", map[string]interface{}{
			"card_id":  card.ID.String(),
			"board_id": card.Column.BoardID.String(),
		})
	}
}

// Helper to notify watchers of card changes
func (h *CardHandler) notifyWatchers(cardID uuid.UUID, actorID uuid.UUID, title, message string, pref services.NotificationPreference) {
	if h.SubscriptionService == nil || h.NotificationService == nil {
		return
	}

	subscribers, err := h.SubscriptionService.GetCardRelatedSubscribers(cardID)
	if err != nil {
		return
	}

	h.NotificationService.NotifySubscribers(subscribers, actorID, models.NotificationMention, title, message, cardID, "CARD", pref)
}

func (h *CardHandler) notifyWatchersExcept(cardID uuid.UUID, actorID uuid.UUID, title, message string, pref services.NotificationPreference, exclude map[uuid.UUID]struct{}) {
	if h.SubscriptionService == nil || h.NotificationService == nil {
		return
	}
	subscribers, err := h.SubscriptionService.GetCardRelatedSubscribers(cardID)
	if err != nil {
		return
	}
	filtered := make([]uuid.UUID, 0, len(subscribers))
	for _, id := range subscribers {
		if exclude != nil {
			if _, ok := exclude[id]; ok {
				continue
			}
		}
		filtered = append(filtered, id)
	}
	h.NotificationService.NotifySubscribers(filtered, actorID, models.NotificationMention, title, message, cardID, "CARD", pref)
}

func extractMentionUserIDs(description string) []uuid.UUID {
	matches := mentionIDPattern.FindAllStringSubmatch(description, -1)
	seen := map[uuid.UUID]struct{}{}
	out := make([]uuid.UUID, 0, len(matches))
	for _, m := range matches {
		if len(m) < 2 {
			continue
		}
		id, err := uuid.Parse(m[1])
		if err != nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func extractMentionTokens(text string) []string {
	matches := mentionTextPattern.FindAllStringSubmatch(text, -1)
	seen := map[string]struct{}{}
	out := make([]string, 0, len(matches))
	for _, m := range matches {
		if len(m) < 2 {
			continue
		}
		token := strings.ToLower(strings.TrimSpace(m[1]))
		if token == "" {
			continue
		}
		if _, ok := seen[token]; ok {
			continue
		}
		seen[token] = struct{}{}
		out = append(out, token)
	}
	return out
}

func (h *CardHandler) notifyDescriptionMentions(card *models.Card, actorID uuid.UUID, description string) map[uuid.UUID]struct{} {
	notified := map[uuid.UUID]struct{}{}
	if h.NotificationService == nil || card == nil || strings.TrimSpace(description) == "" {
		return notified
	}

	db := h.Service.Repo.DB
	var board models.Board
	if err := db.Select("id", "workspace_id").First(&board, "id = ?", card.Column.BoardID).Error; err != nil {
		return notified
	}

	var workspaceMembers []models.WorkspaceMember
	if err := db.Where("workspace_id = ? AND status <> ?", board.WorkspaceID, "declined").Find(&workspaceMembers).Error; err != nil {
		return notified
	}

	allowed := map[uuid.UUID]struct{}{}
	for _, m := range workspaceMembers {
		allowed[m.UserID] = struct{}{}
	}

	mentionedMap := map[uuid.UUID]struct{}{}
	for _, id := range extractMentionUserIDs(description) {
		mentionedMap[id] = struct{}{}
	}

	tokens := extractMentionTokens(description)
	if len(tokens) > 0 {
		memberIDs := make([]uuid.UUID, 0, len(workspaceMembers))
		for _, m := range workspaceMembers {
			memberIDs = append(memberIDs, m.UserID)
		}
		if len(memberIDs) > 0 {
			var users []models.User
			if err := db.Select("id", "name", "username", "email").Where("id IN ?", memberIDs).Find(&users).Error; err == nil {
				tokenSet := map[string]struct{}{}
				for _, t := range tokens {
					tokenSet[t] = struct{}{}
				}
				for _, u := range users {
					candidates := []string{
						strings.ToLower(strings.TrimSpace(u.Username)),
						strings.ToLower(strings.ReplaceAll(strings.TrimSpace(u.Name), " ", "")),
					}
					if parts := strings.Split(strings.ToLower(strings.TrimSpace(u.Email)), "@"); len(parts) > 0 {
						candidates = append(candidates, parts[0])
					}
					for _, c := range candidates {
						if c == "" {
							continue
						}
						if _, ok := tokenSet[c]; ok {
							mentionedMap[u.ID] = struct{}{}
							break
						}
					}
				}
			}
		}
	}

	if len(mentionedMap) == 0 {
		return notified
	}

	var actor models.User
	actorName := "Someone"
	if err := db.Select("id", "name").First(&actor, "id = ?", actorID).Error; err == nil && strings.TrimSpace(actor.Name) != "" {
		actorName = actor.Name
	}

	for recipientID := range mentionedMap {
		if recipientID == actorID {
			continue
		}
		if _, ok := allowed[recipientID]; !ok {
			continue
		}
		_, _ = h.NotificationService.CreateNotification(
			recipientID,
			actorID,
			models.NotificationMention,
			"You were mentioned",
			actorName+" mentioned you in card description: "+card.Title,
			card.ID,
			"CARD",
			services.PrefNotifyComments,
		)
		notified[recipientID] = struct{}{}
	}
	return notified
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

	card, err := h.Service.UpdateCard(id, req.Title, req.Description, req.DueDate, req.IsComplete)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	h.broadcastCardUpdate(card.ID)

	// Log Activity (simplified, could diff changes)
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		// Fetch boardID again or pass it down? fetching it via card is safer
		h.ActivityService.LogActivity(userID, card.Column.BoardID, "updated_card", card.ID, map[string]interface{}{
			"card_title": card.Title,
		})

		// Notify explicitly mentioned members in description markdown: [@Name](mention:<user-id>) or @username
		mentionedRecipients := h.notifyDescriptionMentions(card, userID, req.Description)

		// Notify watchers except explicitly mentioned recipients
		if req.DueDate != nil {
			h.notifyWatchersExcept(card.ID, userID, "Due Date Updated", "A card due date was updated", services.PrefNotifyDueDates, mentionedRecipients)
		} else {
			h.notifyWatchersExcept(card.ID, userID, "Card Updated", "A card you are watching has been updated", "", mentionedRecipients)
		}
	}

	c.JSON(http.StatusOK, card)
}

// Metadata Endpoints

func (h *CardHandler) AddLabel(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}
	labelID, err := uuid.Parse(c.Param("labelId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid label ID"})
		return
	}

	if err := h.Service.AddLabel(cardID, labelID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add label"})
		return
	}
	h.broadcastCardUpdate(cardID)

	// Log Activity
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		card, _ := h.Service.GetCardByID(cardID)
		h.ActivityService.LogActivity(userID, card.Column.BoardID, "added_label", card.ID, map[string]interface{}{
			"label_id": labelID,
		})

		// Notify Subscribers
		h.notifyWatchers(cardID, userID, "Label Added", "A label was added to a card you are watching", "")
	}

	c.Status(http.StatusOK)
}

func (h *CardHandler) RemoveLabel(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}
	labelID, err := uuid.Parse(c.Param("labelId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid label ID"})
		return
	}

	if err := h.Service.RemoveLabel(cardID, labelID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove label"})
		return
	}
	h.broadcastCardUpdate(cardID)
	c.Status(http.StatusOK)
}

func (h *CardHandler) AddMember(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.Service.AddMember(cardID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member"})
		return
	}

	// Auto-subscribe the assigned user to the card
	if h.SubscriptionService != nil {
		isSubscribed, _ := h.SubscriptionService.IsSubscribed(userID, cardID)
		if !isSubscribed {
			_ = h.SubscriptionService.Subscribe(userID, cardID, models.SubscriptionCard)
		}
	}

	h.broadcastCardUpdate(cardID)

	// Log Activity & Create Notification
	if actorIDStr, exists := c.Get("userID"); exists {
		actorID := actorIDStr.(uuid.UUID)
		card, _ := h.Service.GetCardByID(cardID)
		h.ActivityService.LogActivity(actorID, card.Column.BoardID, "assigned_member", card.ID, map[string]interface{}{
			"assigned_user_id": userID,
		})

		// Send notification if not assigning oneself
		if actorID != userID {
			h.NotificationService.CreateNotification(
				userID,
				actorID,
				"ASSIGNMENT",
				"New Card Assignment",
				"You have been assigned to card: "+card.Title,
				card.ID,
				"CARD",
				"",
			)
		}

		// Notify other watchers
		h.notifyWatchers(cardID, actorID, "Member Added", "A new member was added to a card you are watching", "")
	}

	c.Status(http.StatusOK)
}

func (h *CardHandler) RemoveMember(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.Service.RemoveMember(cardID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member"})
		return
	}
	h.broadcastCardUpdate(cardID)

	if actorIDStr, exists := c.Get("userID"); exists {
		actorID := actorIDStr.(uuid.UUID)
		card, _ := h.Service.GetCardByID(cardID)
		if actorID != userID {
			h.NotificationService.CreateNotification(
				userID,
				actorID,
				models.NotificationMention,
				"Removed from Card",
				"You were removed from card: "+card.Title,
				card.ID,
				"CARD",
				services.PrefNotifyRemovedFromCard,
			)
		}
	}
	c.Status(http.StatusOK)
}

func (h *CardHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	card, err := h.Service.GetCardByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	if err := h.Service.DeleteCard(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete card"})
		return
	}

	h.Hub.BroadcastToRoom(card.Column.BoardID.String(), "CARD_UPDATED", map[string]interface{}{
		"card_id":  id.String(),
		"board_id": card.Column.BoardID.String(),
	})

	// Log Activity
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		h.ActivityService.LogActivity(userID, card.Column.BoardID, "deleted_card", card.ColumnID, map[string]interface{}{
			"card_title": card.Title,
		})
	}

	c.Status(http.StatusNoContent)
}

type MoveCardRequest struct {
	ColumnID uuid.UUID `json:"column_id" binding:"required"`
	Position float64   `json:"position" binding:"min=0"`
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

	// Re-fetch to ensure relationships (Column/BoardID) are correct in response/broadcast
	updatedCard, fetchErr := h.Service.GetCardByID(card.ID)
	if fetchErr == nil {
		card = updatedCard
	}

	if h.Hub != nil {
		h.Hub.BroadcastToRoom(card.Column.BoardID.String(), "CARD_MOVED", map[string]interface{}{
			"card_id":   card.ID.String(),
			"column_id": req.ColumnID.String(),
			"position":  req.Position,
		})
	}

	// Log Activity (only if column changed, or maybe even position?)
	// Let's log if column changed or just generic "moved"
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		h.ActivityService.LogActivity(userID, card.Column.BoardID, "moved_card", card.ID, map[string]interface{}{
			"column_id": req.ColumnID,
			"position":  req.Position,
		})

		// Notify Subscribers
		h.notifyWatchers(card.ID, userID, "Card Moved", "A card you are watching was moved to another list", services.PrefNotifyCardMoved)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"moved_card": card,
	})
}

func (h *CardHandler) Archive(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	card, err := h.Service.GetCardByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	if err := h.Service.ArchiveCard(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to archive card"})
		return
	}

	h.broadcastCardUpdate(id)

	// Log Activity
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		h.ActivityService.LogActivity(userID, card.Column.BoardID, "archived_card", card.ID, map[string]interface{}{
			"card_title": card.Title,
		})
		h.notifyWatchers(card.ID, userID, "Card Archived", "A card you are watching was archived", services.PrefNotifyCardArchived)
	}

	c.Status(http.StatusOK)
}

func (h *CardHandler) Restore(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var req struct {
		ColumnID uuid.UUID `json:"column_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Column ID required"})
		return
	}

	if err := h.Service.RestoreCard(id, req.ColumnID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore card"})
		return
	}

	h.broadcastCardUpdate(id)

	// Log Activity
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		card, _ := h.Service.GetCardByID(id)
		h.ActivityService.LogActivity(userID, card.Column.BoardID, "restored_card", card.ID, map[string]interface{}{
			"card_title": card.Title,
		})
	}

	c.Status(http.StatusOK)
}

func (h *CardHandler) Copy(c *gin.Context) {
	idStr := c.Param("id")
	originalCardID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var req struct {
		TargetColumnID uuid.UUID `json:"target_column_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target column ID required"})
		return
	}

	newCard, err := h.Service.CopyCard(originalCardID, req.TargetColumnID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy card"})
		return
	}

	// Broadcast to target board
	if h.Hub != nil {
		h.Hub.BroadcastToRoom(newCard.Column.BoardID.String(), "CARD_CREATED", map[string]interface{}{
			"board_id":  newCard.Column.BoardID.String(),
			"column_id": newCard.ColumnID.String(),
			"card":      newCard,
		})
	}

	// Log Activity
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		h.ActivityService.LogActivity(userID, newCard.Column.BoardID, "copied_card", newCard.ID, map[string]interface{}{
			"card_title":       newCard.Title,
			"source_card_id":   originalCardID,
			"target_column_id": req.TargetColumnID,
		})
	}

	c.JSON(http.StatusCreated, newCard)
}

func (h *CardHandler) GetTemplates(c *gin.Context) {
	boardIDStr := c.Query("board_id")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	templates, err := h.Service.GetCardTemplates(boardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch card templates"})
		return
	}

	c.JSON(http.StatusOK, templates)
}

func (h *CardHandler) SaveAsTemplate(c *gin.Context) {
	cardIDStr := c.Param("id")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var req struct {
		TemplateName string `json:"template_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Template name is required"})
		return
	}

	card, err := h.Service.SaveCardAsTemplate(cardID, req.TemplateName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save card as template"})
		return
	}

	// Sync via WebSocket
	if h.Hub != nil {
		h.Hub.BroadcastToRoom(card.Column.BoardID.String(), "TEMPLATES_UPDATED", map[string]interface{}{
			"board_id": card.Column.BoardID.String(),
		})
		h.broadcastCardUpdate(card.ID)
	}

	// Log Activity
	if userIDStr, exists := c.Get("userID"); exists {
		userID := userIDStr.(uuid.UUID)
		h.ActivityService.LogActivity(userID, card.Column.BoardID, "saved_card_template", card.ID, map[string]interface{}{
			"template_name": req.TemplateName,
		})
	}

	c.JSON(http.StatusOK, card)
}
