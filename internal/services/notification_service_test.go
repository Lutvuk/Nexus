package services_test

import (
	"fmt"
	"testing"

	"nexus-backend/internal/models"
	"nexus-backend/internal/services"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupNotificationTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.Exec(`CREATE TABLE users (
		id TEXT PRIMARY KEY,
		email TEXT,
		password TEXT,
		name TEXT,
		avatar_url TEXT,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME
	)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE notifications (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		actor_id TEXT,
		type TEXT NOT NULL,
		title TEXT NOT NULL,
		message TEXT NOT NULL,
		entity_id TEXT NOT NULL,
		entity_type TEXT NOT NULL,
		board_id TEXT,
		is_read INTEGER DEFAULT 0,
		created_at DATETIME
	)`).Error)
	return db
}

func TestNotificationService_MarkAsReadForUser(t *testing.T) {
	db := setupNotificationTestDB(t)
	service := services.NewNotificationService(db, nil, services.NewConsoleEmailService())

	userID := uuid.New()
	otherUserID := uuid.New()
	notificationID := uuid.New()

	require.NoError(t, db.Create(&models.Notification{
		ID:         notificationID,
		UserID:     userID,
		Type:       models.NotificationMention,
		Title:      "Test",
		Message:    "Test message",
		EntityID:   uuid.New(),
		EntityType: "CARD",
		IsRead:     false,
	}).Error)

	err := service.MarkAsReadForUser(notificationID, otherUserID)
	require.ErrorIs(t, err, services.ErrNotificationNotFound)

	err = service.MarkAsReadForUser(notificationID, userID)
	require.NoError(t, err)

	var updated models.Notification
	require.NoError(t, db.First(&updated, "id = ?", notificationID).Error)
	require.True(t, updated.IsRead)
}
