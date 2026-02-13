package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"nexus-backend/internal/middleware"
	"nexus-backend/internal/models"
	"nexus-backend/internal/realtime"
	"nexus-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AttachmentHandler struct {
	DB                  *gorm.DB
	Hub                 *realtime.Hub
	NotificationService *services.NotificationService
	SubscriptionService *services.SubscriptionService
}

func NewAttachmentHandler(db *gorm.DB, hub *realtime.Hub, notificationService *services.NotificationService, subService *services.SubscriptionService) *AttachmentHandler {
	return &AttachmentHandler{
		DB:                  db,
		Hub:                 hub,
		NotificationService: notificationService,
		SubscriptionService: subService,
	}
}

// Helper to notify watchers of card changes
func (h *AttachmentHandler) notifyWatchers(cardID uuid.UUID, actorID uuid.UUID, title, message string) {
	if h.SubscriptionService == nil || h.NotificationService == nil {
		return
	}

	subscribers, err := h.SubscriptionService.GetCardRelatedSubscribers(cardID)
	if err != nil {
		return
	}

	h.NotificationService.NotifySubscribers(subscribers, actorID, models.NotificationMention, title, message, cardID, "CARD", services.PrefNotifyAttachments)
}

func (h *AttachmentHandler) broadcastCardUpdate(cardID uuid.UUID) {
	if h.Hub == nil {
		return
	}
	var card models.Card
	if err := h.DB.Preload("Column").First(&card, "id = ?", cardID).Error; err == nil {
		h.Hub.BroadcastToRoom(card.Column.BoardID.String(), "CARD_UPDATED", map[string]interface{}{
			"card_id":  card.ID.String(),
			"board_id": card.Column.BoardID.String(),
		})
	}
}

func (h *AttachmentHandler) getCardBoardID(cardID uuid.UUID) (uuid.UUID, error) {
	var card models.Card
	if err := h.DB.Preload("Column").First(&card, "id = ?", cardID).Error; err != nil {
		return uuid.Nil, err
	}
	return card.Column.BoardID, nil
}

func (h *AttachmentHandler) hasBoardAccess(userID, boardID uuid.UUID) bool {
	var count int64
	h.DB.Table("boards").
		Joins("JOIN workspaces w ON w.id = boards.workspace_id").
		Joins("LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ? AND wm.status = 'accepted'", userID).
		Where("boards.id = ? AND (w.owner_id = ? OR wm.user_id IS NOT NULL)", boardID, userID).
		Count(&count)
	return count > 0
}

// UploadAttachment handles file upload associated with a card
func (h *AttachmentHandler) UploadAttachment(c *gin.Context) {
	cardIDStr := c.Param("id")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	// Get user from context (set by AuthMiddleware)
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	boardID, err := h.getCardBoardID(cardID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}
	if !h.hasBoardAccess(userID, boardID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// 1. Get file from request
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// 2. Validate file type/size (Basic validation)
	if file.Size > 5*1024*1024 { // 5MB limit
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 5MB limit"})
		return
	}

	// 3. Ensure uploads directory exists
	uploadDir := "./uploads"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.Mkdir(uploadDir, 0755)
	}

	// 4. Generate unique filename
	ext := filepath.Ext(file.Filename)
	newFilename := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), uuid.New().String(), ext)
	dst := filepath.Join(uploadDir, newFilename)

	// 5. Save file to disk
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// 6. Create Attachment record
	attachment := models.Attachment{
		CardID:    cardID,
		UserID:    userID,
		Filename:  file.Filename,
		FilePath:  "/uploads/" + newFilename, // Relative URL path
		FileType:  file.Header.Get("Content-Type"),
		Size:      file.Size,
		CreatedAt: time.Now(),
	}

	if err := h.DB.Create(&attachment).Error; err != nil {
		// Clean up file if DB insert fails
		os.Remove(dst)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save attachment info"})
		return
	}

	h.broadcastCardUpdate(cardID)

	// Notify Subscribers
	h.notifyWatchers(cardID, userID, "Attachment Uploaded", "A new file was uploaded to a card you are watching")

	c.JSON(http.StatusCreated, attachment)
}

// DeleteAttachment removes a file and its record
func (h *AttachmentHandler) DeleteAttachment(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	attachmentIDStr := c.Param("attachmentId")
	attachmentID, err := uuid.Parse(attachmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attachment ID"})
		return
	}

	var attachment models.Attachment
	if err := h.DB.First(&attachment, "id = ?", attachmentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attachment not found"})
		return
	}

	boardID, err := h.getCardBoardID(attachment.CardID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}
	if !h.hasBoardAccess(userID, boardID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// 1. Delete file from disk
	// Remove leading "/uploads/" to get filesystem path
	fileName := strings.TrimPrefix(attachment.FilePath, "/uploads/")
	filePath := filepath.Join("./uploads", fileName)
	os.Remove(filePath) // Ignore error if file already gone

	// 2. Delete from DB
	if err := h.DB.Delete(&attachment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete attachment record"})
		return
	}

	h.broadcastCardUpdate(attachment.CardID)
	c.JSON(http.StatusOK, gin.H{"message": "Attachment deleted"})
}

// MakeCover sets an attachment as the card's cover image
func (h *AttachmentHandler) MakeCover(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	cardIDStr := c.Param("id")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var input struct {
		AttachmentID uuid.UUID `json:"attachment_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	boardID, err := h.getCardBoardID(cardID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}
	if !h.hasBoardAccess(userID, boardID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Verify attachment belongs to card
	var count int64
	h.DB.Model(&models.Attachment{}).Where("id = ? AND card_id = ?", input.AttachmentID, cardID).Count(&count)
	if count == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Attachment does not belong to this card"})
		return
	}

	// Update Card
	if err := h.DB.Model(&models.Card{}).Where("id = ?", cardID).Update("cover_attachment_id", input.AttachmentID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update card cover"})
		return
	}

	h.broadcastCardUpdate(cardID)
	c.JSON(http.StatusOK, gin.H{"message": "Cover updated"})
}

// RemoveCover removes the cover image from a card
func (h *AttachmentHandler) RemoveCover(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	cardIDStr := c.Param("id")
	cardID, err := uuid.Parse(cardIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	boardID, err := h.getCardBoardID(cardID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}
	if !h.hasBoardAccess(userID, boardID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := h.DB.Model(&models.Card{}).Where("id = ?", cardID).Update("cover_attachment_id", nil).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove card cover"})
		return
	}

	h.broadcastCardUpdate(cardID)
	c.JSON(http.StatusOK, gin.H{"message": "Cover removed"})
}
