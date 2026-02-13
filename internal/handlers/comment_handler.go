package handlers

import (
	"log"
	"net/http"
	"nexus-backend/internal/models"
	"nexus-backend/internal/realtime"
	"nexus-backend/internal/services"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var commentMentionPattern = regexp.MustCompile(`mention:([0-9a-fA-F-]{36})`)
var commentMentionTextPattern = regexp.MustCompile(`(?:^|\s)@([a-zA-Z0-9._-]{2,50})`)

type CommentHandler struct {
	Service             *services.CommentService
	NotificationService *services.NotificationService
	SubscriptionService *services.SubscriptionService
	DB                  *gorm.DB
	Hub                 *realtime.Hub
}

func NewCommentHandler(service *services.CommentService, notificationService *services.NotificationService, subService *services.SubscriptionService, db *gorm.DB, hub *realtime.Hub) *CommentHandler {
	return &CommentHandler{
		Service:             service,
		NotificationService: notificationService,
		SubscriptionService: subService,
		DB:                  db,
		Hub:                 hub,
	}
}

func (h *CommentHandler) broadcastCardUpdate(cardID uuid.UUID) {
	if h.Hub == nil {
		log.Println("[CommentHandler] Hub is nil, skipping broadcast")
		return
	}
	var card models.Card
	if err := h.DB.Preload("Column").First(&card, "id = ?", cardID).Error; err == nil {
		log.Printf("[CommentHandler] Found board %s, broadcasting to room", card.Column.BoardID)
		h.Hub.BroadcastToRoom(card.Column.BoardID.String(), "CARD_UPDATED", map[string]interface{}{
			"card_id":  card.ID.String(),
			"board_id": card.Column.BoardID.String(),
		})
	} else {
		log.Printf("[CommentHandler] Failed to find card %s for broadcast: %v", cardID, err)
	}
}

func (h *CommentHandler) notifyWatchersExcept(cardID uuid.UUID, actorID uuid.UUID, title, message string, pref services.NotificationPreference, exclude map[uuid.UUID]struct{}) {
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

func extractCommentMentionIDs(content string) []uuid.UUID {
	matches := commentMentionPattern.FindAllStringSubmatch(content, -1)
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

func extractCommentMentionTokens(content string) []string {
	matches := commentMentionTextPattern.FindAllStringSubmatch(content, -1)
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

func (h *CommentHandler) notifyCommentMentions(cardID, actorID uuid.UUID, content string) map[uuid.UUID]struct{} {
	notified := map[uuid.UUID]struct{}{}
	if h.NotificationService == nil || strings.TrimSpace(content) == "" {
		return notified
	}
	var card models.Card
	if err := h.DB.Preload("Column").First(&card, "id = ?", cardID).Error; err != nil {
		return notified
	}
	var board models.Board
	if err := h.DB.Select("id", "workspace_id").First(&board, "id = ?", card.Column.BoardID).Error; err != nil {
		return notified
	}

	var workspaceMembers []models.WorkspaceMember
	if err := h.DB.Where("workspace_id = ? AND status <> ?", board.WorkspaceID, "declined").Find(&workspaceMembers).Error; err != nil {
		return notified
	}
	allowed := map[uuid.UUID]struct{}{}
	for _, wm := range workspaceMembers {
		allowed[wm.UserID] = struct{}{}
	}

	mentionedMap := map[uuid.UUID]struct{}{}
	for _, id := range extractCommentMentionIDs(content) {
		mentionedMap[id] = struct{}{}
	}

	tokens := extractCommentMentionTokens(content)
	if len(tokens) > 0 {
		memberIDs := make([]uuid.UUID, 0, len(workspaceMembers))
		for _, wm := range workspaceMembers {
			memberIDs = append(memberIDs, wm.UserID)
		}
		if len(memberIDs) > 0 {
			var users []models.User
			if err := h.DB.Select("id", "name", "username", "email").Where("id IN ?", memberIDs).Find(&users).Error; err == nil {
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

	actorName := "Someone"
	var actor models.User
	if err := h.DB.Select("id", "name").First(&actor, "id = ?", actorID).Error; err == nil && strings.TrimSpace(actor.Name) != "" {
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
			"You were mentioned in a comment",
			actorName+" mentioned you in card: "+card.Title,
			cardID,
			"CARD",
			services.PrefNotifyComments,
		)
		notified[recipientID] = struct{}{}
	}
	return notified
}

func (h *CommentHandler) CreateComment(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)

	log.Printf("[CommentHandler] Creating comment for card %s", cardID)
	comment, err := h.Service.CreateComment(cardID, userID, req.Content)
	if err != nil {
		log.Printf("[CommentHandler] Error creating comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create comment"})
		return
	}

	// Notify explicit mentions first, then notify watchers except mentioned users.
	mentionedRecipients := h.notifyCommentMentions(cardID, userID, req.Content)
	h.notifyWatchersExcept(cardID, userID, "New Comment", "A new comment was added to a card you are watching", services.PrefNotifyComments, mentionedRecipients)

	log.Printf("[CommentHandler] Broadcasting CARD_UPDATED for card %s", cardID)
	h.broadcastCardUpdate(cardID)

	c.JSON(http.StatusCreated, comment)
}

func (h *CommentHandler) DeleteComment(c *gin.Context) {
	commentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)
	log.Printf("[CommentHandler] DeleteComment: user %s attempting to delete comment %s", userID, commentID)

	// We need cardID to broadcast. Service should probably return it or we fetch it.
	// For now, let's fetch the comment to get CardID before deletion.
	var comment models.Comment
	if err := h.DB.First(&comment, "id = ?", commentID).Error; err != nil {
		log.Printf("[CommentHandler] Comment not found: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		return
	}

	log.Printf("[CommentHandler] Comment owner: %s, requester: %s", comment.UserID, userID)

	if err := h.Service.DeleteComment(commentID, userID); err != nil {
		log.Printf("[CommentHandler] DeleteComment failed: %v", err)
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete comment. You can only delete your own comments."})
		return
	}

	h.broadcastCardUpdate(comment.CardID)
	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted"})
}
