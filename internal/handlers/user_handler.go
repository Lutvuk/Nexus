package handlers

import (
	"fmt"
	"io"
	"net/http"
	"nexus-backend/internal/middleware"
	"nexus-backend/internal/models"
	"nexus-backend/internal/services"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserHandler struct {
	DB           *gorm.DB
	EmailService services.EmailService
}

func NewUserHandler(db *gorm.DB, emailService services.EmailService) *UserHandler {
	return &UserHandler{DB: db, EmailService: emailService}
}

func (h *UserHandler) resolveEmailVerified(userID interface{}, email string) bool {
	var verification models.EmailVerification
	if err := h.DB.Where("user_id = ? AND email = ?", userID, email).First(&verification).Error; err != nil {
		// Legacy users without verification records are treated as verified.
		return true
	}
	return verification.VerifiedAt != nil
}

// GetMe returns the current user's profile
func (h *UserHandler) GetMe(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := h.DB.Select("id, email, name, username, bio, avatar_url, language, has_completed_onboarding, created_at").First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	user.EmailVerified = h.resolveEmailVerified(user.ID, user.Email)

	c.JSON(http.StatusOK, user)
}

// UpdateProfile updates the current user's profile
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Name      *string `json:"name"`
		Username  *string `json:"username"`
		Bio       *string `json:"bio"`
		AvatarURL *string `json:"avatar_url"`
		Language  *string `json:"language"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = strings.TrimSpace(*req.Name)
	}
	if req.Username != nil {
		username := strings.TrimSpace(*req.Username)
		// Check uniqueness
		if username != "" {
			var existing models.User
			if result := h.DB.Where("username = ? AND id != ?", username, userID).First(&existing); result.Error == nil {
				c.JSON(http.StatusConflict, gin.H{"error": "Username already taken"})
				return
			}
		}
		updates["username"] = username
	}
	if req.Bio != nil {
		updates["bio"] = strings.TrimSpace(*req.Bio)
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = strings.TrimSpace(*req.AvatarURL)
	}
	if req.Language != nil {
		updates["language"] = strings.TrimSpace(*req.Language)
	}

	if len(updates) == 0 {
		var user models.User
		if err := h.DB.Select("id, email, name, username, bio, avatar_url, language, has_completed_onboarding").First(&user, "id = ?", userID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load profile"})
			return
		}
		user.EmailVerified = h.resolveEmailVerified(user.ID, user.Email)
		c.JSON(http.StatusOK, user)
		return
	}

	if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	// Return updated user
	var user models.User
	h.DB.Select("id, email, name, username, bio, avatar_url, language, has_completed_onboarding").First(&user, "id = ?", userID)
	user.EmailVerified = h.resolveEmailVerified(user.ID, user.Email)
	c.JSON(http.StatusOK, user)
}

// UploadAvatar handles file upload for user avatar
func (h *UserHandler) UploadAvatar(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	// Validate file size (max 5MB)
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large. Maximum 5MB."})
		return
	}

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}
	if !allowedTypes[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."})
		return
	}

	// Create uploads/avatars directory
	avatarDir := "./uploads/avatars"
	if err := os.MkdirAll(avatarDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s_%d%s", userID.String(), time.Now().Unix(), ext)
	filePath := filepath.Join(avatarDir, filename)

	// Save file
	out, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Update user avatar URL
	avatarURL := "/uploads/avatars/" + filename
	if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Update("avatar_url", avatarURL).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"avatar_url": avatarURL})
}

// GetPreferences returns user preferences
func (h *UserHandler) GetPreferences(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var prefs models.UserPreferences
	result := h.DB.Where("user_id = ?", userID).First(&prefs)
	if result.Error != nil {
		// Create default preferences if not exist
		prefs = models.UserPreferences{
			UserID:                    userID,
			NotifyComments:            true,
			NotifyDueDates:            true,
			NotifyRemovedFromCard:     true,
			NotifyAttachments:         true,
			NotifyCardCreated:         true,
			NotifyCardMoved:           true,
			NotifyCardArchived:        true,
			AllowDesktopNotifications: false,
			ColorBlindMode:            false,
			DisableKeyboardShortcuts:  false,
			EnableSuggestions:         true,
			MarketingEmails:           false,
			CookieAnalytics:           true,
		}
		h.DB.Create(&prefs)
	}

	c.JSON(http.StatusOK, prefs)
}

// UpdatePreferences updates user preferences
func (h *UserHandler) UpdatePreferences(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		NotifyComments            *bool `json:"notify_comments"`
		NotifyDueDates            *bool `json:"notify_due_dates"`
		NotifyRemovedFromCard     *bool `json:"notify_removed_from_card"`
		NotifyAttachments         *bool `json:"notify_attachments"`
		NotifyCardCreated         *bool `json:"notify_card_created"`
		NotifyCardMoved           *bool `json:"notify_card_moved"`
		NotifyCardArchived        *bool `json:"notify_card_archived"`
		AllowDesktopNotifications *bool `json:"allow_desktop_notifications"`
		ColorBlindMode            *bool `json:"color_blind_mode"`
		DisableKeyboardShortcuts  *bool `json:"disable_keyboard_shortcuts"`
		EnableSuggestions         *bool `json:"enable_suggestions"`
		MarketingEmails           *bool `json:"marketing_emails"`
		CookieAnalytics           *bool `json:"cookie_analytics"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Ensure the preferences exist
	var existing models.UserPreferences
	result := h.DB.Where("user_id = ?", userID).First(&existing)
	if result.Error != nil {
		existing = models.UserPreferences{
			UserID:                    userID,
			NotifyComments:            true,
			NotifyDueDates:            true,
			NotifyRemovedFromCard:     true,
			NotifyAttachments:         true,
			NotifyCardCreated:         true,
			NotifyCardMoved:           true,
			NotifyCardArchived:        true,
			AllowDesktopNotifications: false,
			ColorBlindMode:            false,
			DisableKeyboardShortcuts:  false,
			EnableSuggestions:         true,
			MarketingEmails:           false,
			CookieAnalytics:           true,
		}
		_ = h.DB.Create(&existing).Error
	}

	oldMarketing := existing.MarketingEmails
	marketingChanged := false

	updates := map[string]interface{}{}
	if req.NotifyComments != nil {
		updates["notify_comments"] = *req.NotifyComments
	}
	if req.NotifyDueDates != nil {
		updates["notify_due_dates"] = *req.NotifyDueDates
	}
	if req.NotifyRemovedFromCard != nil {
		updates["notify_removed_from_card"] = *req.NotifyRemovedFromCard
	}
	if req.NotifyAttachments != nil {
		updates["notify_attachments"] = *req.NotifyAttachments
	}
	if req.NotifyCardCreated != nil {
		updates["notify_card_created"] = *req.NotifyCardCreated
	}
	if req.NotifyCardMoved != nil {
		updates["notify_card_moved"] = *req.NotifyCardMoved
	}
	if req.NotifyCardArchived != nil {
		updates["notify_card_archived"] = *req.NotifyCardArchived
	}
	if req.AllowDesktopNotifications != nil {
		updates["allow_desktop_notifications"] = *req.AllowDesktopNotifications
	}
	if req.ColorBlindMode != nil {
		updates["color_blind_mode"] = *req.ColorBlindMode
	}
	if req.DisableKeyboardShortcuts != nil {
		updates["disable_keyboard_shortcuts"] = *req.DisableKeyboardShortcuts
	}
	if req.EnableSuggestions != nil {
		updates["enable_suggestions"] = *req.EnableSuggestions
	}
	if req.MarketingEmails != nil {
		updates["marketing_emails"] = *req.MarketingEmails
		marketingChanged = oldMarketing != *req.MarketingEmails
	}
	if req.CookieAnalytics != nil {
		updates["cookie_analytics"] = *req.CookieAnalytics
	}

	if len(updates) > 0 {
		if err := h.DB.Model(&existing).Where("user_id = ?", userID).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
			return
		}
	}

	// Return updated preferences
	var prefs models.UserPreferences
	h.DB.Where("user_id = ?", userID).First(&prefs)

	if marketingChanged && h.EmailService != nil {
		var user models.User
		if err := h.DB.Select("email, name").First(&user, "id = ?", userID).Error; err == nil && user.Email != "" {
			subject := "Nexus marketing emails preference updated"
			body := "You have opted out of Nexus marketing emails."
			if prefs.MarketingEmails {
				body = "You are now subscribed to Nexus marketing emails. We'll only send occasional product updates."
			}
			_ = h.EmailService.SendNotificationEmail(user.Email, subject, body)
		}
	}

	c.JSON(http.StatusOK, prefs)
}

// GetUserActivity returns cross-workspace activity for the current user
func (h *UserHandler) GetUserActivity(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	var activities []models.Activity
	if err := h.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Preload("User").
		Find(&activities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activities"})
		return
	}

	// Enrich activity with board/workspace context for personal history view.
	boardIDSeen := map[string]bool{}
	boardIDs := make([]interface{}, 0, len(activities))
	for _, a := range activities {
		id := a.BoardID.String()
		if id == "" || boardIDSeen[id] {
			continue
		}
		boardIDSeen[id] = true
		boardIDs = append(boardIDs, a.BoardID)
	}

	type boardLite struct {
		ID          string
		Title       string
		WorkspaceID string
	}
	boardMeta := map[string]boardLite{}
	workspaceIDs := make([]interface{}, 0)
	workspaceSeen := map[string]bool{}
	if len(boardIDs) > 0 {
		var boards []models.Board
		h.DB.Select("id, title, workspace_id").Where("id IN ?", boardIDs).Find(&boards)
		for _, b := range boards {
			boardMeta[b.ID.String()] = boardLite{
				ID:          b.ID.String(),
				Title:       b.Title,
				WorkspaceID: b.WorkspaceID.String(),
			}
			wsID := b.WorkspaceID.String()
			if wsID != "" && !workspaceSeen[wsID] {
				workspaceSeen[wsID] = true
				workspaceIDs = append(workspaceIDs, b.WorkspaceID)
			}
		}
	}

	type workspaceLite struct {
		ID   string
		Name string
	}
	workspaceMeta := map[string]workspaceLite{}
	if len(workspaceIDs) > 0 {
		var workspaces []models.Workspace
		h.DB.Select("id, name").Where("id IN ?", workspaceIDs).Find(&workspaces)
		for _, w := range workspaces {
			workspaceMeta[w.ID.String()] = workspaceLite{ID: w.ID.String(), Name: w.Name}
		}
	}

	enriched := make([]gin.H, 0, len(activities))
	for _, a := range activities {
		item := gin.H{
			"id":         a.ID,
			"user_id":    a.UserID,
			"user":       a.User,
			"board_id":   a.BoardID,
			"action":     a.Action,
			"target_id":  a.TargetID,
			"metadata":   a.Metadata,
			"created_at": a.CreatedAt,
		}
		if b, ok := boardMeta[a.BoardID.String()]; ok {
			item["board_title"] = b.Title
			item["workspace_id"] = b.WorkspaceID
			if w, wk := workspaceMeta[b.WorkspaceID]; wk {
				item["workspace_name"] = w.Name
			}
		}
		enriched = append(enriched, item)
	}

	// Get total count
	var total int64
	h.DB.Model(&models.Activity{}).Where("user_id = ?", userID).Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"activities": enriched,
		"total":      total,
		"page":       page,
		"limit":      limit,
	})
}

// CompleteOnboarding marks the user's onboarding as complete
func (h *UserHandler) CompleteOnboarding(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Update("has_completed_onboarding", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update onboarding status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Onboarding completed"})
}
