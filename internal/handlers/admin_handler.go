package handlers

import (
	"net/http"
	"os"
	"strings"
	"time"

	"nexus-backend/internal/middleware"
	"nexus-backend/internal/models"
	"nexus-backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminHandler struct {
	DB                 *gorm.DB
	DueReminderService *services.DueDateReminderService
}

func NewAdminHandler(db *gorm.DB, dueReminderService *services.DueDateReminderService) *AdminHandler {
	return &AdminHandler{
		DB:                 db,
		DueReminderService: dueReminderService,
	}
}

func (h *AdminHandler) RunDueDateReminders(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := h.DB.Select("id, email").First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if !h.isAllowedAdminEmail(user.Email) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Forbidden. Set ADMIN_USER_EMAILS to allow this account.",
		})
		return
	}

	if h.DueReminderService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Due reminder service unavailable"})
		return
	}

	started := time.Now()
	stats := h.DueReminderService.RunOnce()

	c.JSON(http.StatusOK, gin.H{
		"message":     "Due date reminder run completed",
		"started_at":  started.UTC(),
		"duration_ms": time.Since(started).Milliseconds(),
		"stats":       stats,
	})
}

func (h *AdminHandler) isAllowedAdminEmail(email string) bool {
	allowlist := strings.TrimSpace(os.Getenv("ADMIN_USER_EMAILS"))
	if allowlist == "" {
		// Dev-friendly fallback: if no allowlist configured, permit authenticated users.
		return true
	}
	if email == "" {
		return false
	}

	email = strings.ToLower(strings.TrimSpace(email))
	for _, raw := range strings.Split(allowlist, ",") {
		allowed := strings.ToLower(strings.TrimSpace(raw))
		if allowed != "" && allowed == email {
			return true
		}
	}
	return false
}
