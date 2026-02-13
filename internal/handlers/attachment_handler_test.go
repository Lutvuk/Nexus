package handlers_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"nexus-backend/internal/handlers"
	"nexus-backend/internal/models"

	"github.com/glebarez/sqlite"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupAttachmentHandlerDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.Exec(`CREATE TABLE users (
		id TEXT PRIMARY KEY,
		email TEXT,
		password TEXT,
		name TEXT,
		username TEXT,
		bio TEXT,
		avatar_url TEXT,
		language TEXT,
		has_completed_onboarding INTEGER DEFAULT 0,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME
	)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE workspaces (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		owner_id TEXT NOT NULL,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME
	)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE workspace_members (
		workspace_id TEXT NOT NULL,
		user_id TEXT NOT NULL,
		role TEXT,
		status TEXT,
		added_at DATETIME,
		PRIMARY KEY (workspace_id, user_id)
	)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE boards (
		id TEXT PRIMARY KEY,
		workspace_id TEXT NOT NULL,
		title TEXT NOT NULL,
		background_color TEXT,
		background_image_url TEXT,
		documentation_notes TEXT,
		is_starred INTEGER DEFAULT 0,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME
	)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE columns (
		id TEXT PRIMARY KEY,
		board_id TEXT,
		name TEXT NOT NULL,
		position REAL NOT NULL,
		created_at DATETIME,
		updated_at DATETIME
	)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE cards (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		description TEXT,
		column_id TEXT NOT NULL,
		position REAL NOT NULL,
		created_at DATETIME,
		updated_at DATETIME,
		is_archived INTEGER DEFAULT 0,
		archived_at DATETIME,
		is_template INTEGER DEFAULT 0,
		template_name TEXT,
		due_date DATETIME,
		is_complete INTEGER DEFAULT 0,
		cover_attachment_id TEXT
	)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE attachments (
		id TEXT PRIMARY KEY,
		card_id TEXT NOT NULL,
		user_id TEXT NOT NULL,
		filename TEXT NOT NULL,
		file_path TEXT NOT NULL,
		file_type TEXT NOT NULL,
		size INTEGER NOT NULL,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME
	)`).Error)
	return db
}

func seedAttachmentScenario(t *testing.T, db *gorm.DB) (ownerID, outsiderID, attachmentID uuid.UUID) {
	t.Helper()

	ownerID = uuid.New()
	outsiderID = uuid.New()
	workspaceID := uuid.New()
	boardID := uuid.New()
	columnID := uuid.New()
	cardID := uuid.New()
	attachmentID = uuid.New()

	require.NoError(t, db.Create(&models.User{ID: ownerID, Email: "owner@example.com"}).Error)
	require.NoError(t, db.Create(&models.User{ID: outsiderID, Email: "outsider@example.com"}).Error)
	require.NoError(t, db.Create(&models.Workspace{ID: workspaceID, Name: "WS", OwnerID: ownerID}).Error)
	require.NoError(t, db.Create(&models.Board{ID: boardID, WorkspaceID: workspaceID, Title: "Board"}).Error)
	require.NoError(t, db.Create(&models.Column{ID: columnID, BoardID: boardID, Name: "Col", Position: 0}).Error)
	require.NoError(t, db.Create(&models.Card{ID: cardID, ColumnID: columnID, Title: "Card", Position: 0}).Error)
	require.NoError(t, db.Create(&models.Attachment{
		ID:       attachmentID,
		CardID:   cardID,
		UserID:   ownerID,
		Filename: "test.txt",
		FilePath: "/uploads/test.txt",
		FileType: "text/plain",
		Size:     4,
	}).Error)

	return ownerID, outsiderID, attachmentID
}

func TestAttachmentHandler_DeleteAttachment_EnforcesBoardAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupAttachmentHandlerDB(t)
	ownerID, outsiderID, attachmentID := seedAttachmentScenario(t, db)

	handler := handlers.NewAttachmentHandler(db, nil, nil, nil)

	router := gin.New()
	router.Use(withUser(outsiderID))
	router.DELETE("/attachments/:attachmentId", handler.DeleteAttachment)

	req := httptest.NewRequest(http.MethodDelete, "/attachments/"+attachmentID.String(), nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusForbidden, rec.Code)

	// Owner can delete
	router = gin.New()
	router.Use(withUser(ownerID))
	router.DELETE("/attachments/:attachmentId", handler.DeleteAttachment)

	req = httptest.NewRequest(http.MethodDelete, "/attachments/"+attachmentID.String(), nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)
}
