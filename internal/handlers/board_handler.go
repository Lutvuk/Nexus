package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"nexus-backend/internal/middleware"
	"nexus-backend/internal/models"
	"nexus-backend/internal/realtime"
	"nexus-backend/internal/repository"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type BoardHandler struct {
	Repo *repository.BoardRepository
	DB   *gorm.DB // Kept for legacy compatibility if needed
	Hub  *realtime.Hub
}

func NewBoardHandler(repo *repository.BoardRepository, db *gorm.DB, hub *realtime.Hub) *BoardHandler {
	return &BoardHandler{Repo: repo, DB: db, Hub: hub}
}

// GetBoards returns all boards for the authenticated user (Dashboard)
func (h *BoardHandler) GetBoards(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	boards, err := h.Repo.GetBoardsByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch boards"})
		return
	}

	c.JSON(http.StatusOK, boards)
}

// GetBoardByID returns a single board with columns for the Canvas
func (h *BoardHandler) GetBoardByID(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	boardIDStr := c.Param("id")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	// Verify ownership via Repository
	board, err := h.Repo.GetBoardByID(boardID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found or access denied"})
		return
	}

	// Fetch Columns & Cards (Legacy Logic Refactored)
	var columns []models.Column
	if err := h.DB.Where("board_id = ?", board.ID).
		Preload("Cards", func(db *gorm.DB) *gorm.DB {
			return db.Where("is_archived = ?", false).
				Order("position ASC").
				Preload("Checklists").
				Preload("Labels").
				Preload("Members").
				Preload("Attachments")
		}).Order("position ASC").Find(&columns).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch columns"})
		return
	}

	// Compute CardCount
	for i := range columns {
		columns[i].CardCount = len(columns[i].Cards)
		if columns[i].Cards == nil {
			columns[i].Cards = []models.Card{}
		}
	}

	// Fetch user role in the workspace
	var userRole string = "member"
	var workspace models.Workspace
	if err := h.DB.Select("id, owner_id").First(&workspace, "id = ?", board.WorkspaceID).Error; err == nil {
		if workspace.OwnerID == userID {
			userRole = "owner"
		} else {
			var member models.WorkspaceMember
			if err := h.DB.Select("role").Where("workspace_id = ? AND user_id = ?", board.WorkspaceID, userID).First(&member).Error; err == nil {
				userRole = member.Role
			}
		}
	}

	// Construct Response
	response := gin.H{
		"board":     board,
		"columns":   columns,
		"user_role": userRole,
	}

	c.JSON(http.StatusOK, response)
}

// CreateBoard creates a new board in a specific workspace or default
func (h *BoardHandler) CreateBoard(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Title       string    `json:"title" binding:"required,min=1,max=200"`
		WorkspaceID uuid.UUID `json:"workspace_id"`
		TemplateID  uuid.UUID `json:"template_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var workspaceID uuid.UUID

	if req.WorkspaceID != uuid.Nil {
		// Verify access to provided workspace
		var member models.WorkspaceMember
		var workspace models.Workspace

		// Check if Owner
		if err := h.DB.Where("id = ? AND owner_id = ?", req.WorkspaceID, userID).First(&workspace).Error; err == nil {
			workspaceID = workspace.ID
		} else {
			// Check if Member
			if err := h.DB.Where("workspace_id = ? AND user_id = ?", req.WorkspaceID, userID).First(&member).Error; err == nil {
				workspaceID = member.WorkspaceID
			} else {
				c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to workspace"})
				return
			}
		}
	} else {
		// Fallback to default (First Owned Workspace)
		var workspace models.Workspace
		if err := h.DB.Where("owner_id = ?", userID).Order("created_at asc").First(&workspace).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "No default workspace found"})
			return
		}
		workspaceID = workspace.ID
	}

	// Create board
	board := models.Board{
		ID:          uuid.New(),
		Title:       req.Title,
		WorkspaceID: workspaceID,
	}

	// Start Transaction
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&board).Error; err != nil {
			return err
		}

		// Handle template if provided
		if req.TemplateID != uuid.Nil {
			var template models.BoardTemplate
			if err := tx.First(&template, "id = ?", req.TemplateID).Error; err != nil {
				return err
			}

			// Parse template data
			var templateData struct {
				Columns []struct {
					Name     string  `json:"name"`
					Position float64 `json:"position"`
				} `json:"columns"`
				CustomFields []struct {
					Name     string   `json:"name"`
					Type     string   `json:"type"`
					Options  []string `json:"options"`
					Position float64  `json:"position"`
				} `json:"custom_fields"`
				Labels []struct {
					Name  string `json:"name"`
					Color string `json:"color"`
				} `json:"labels"`
			}
			if err := json.Unmarshal(template.Data, &templateData); err != nil {
				return err
			}

			// Create columns from template
			for _, tc := range templateData.Columns {
				col := models.Column{
					ID:       uuid.New(),
					BoardID:  board.ID,
					Name:     tc.Name,
					Position: tc.Position,
				}
				if err := tx.Create(&col).Error; err != nil {
					return err
				}
			}

			// Create custom fields from template (if any)
			for i, tf := range templateData.CustomFields {
				if tf.Name == "" || tf.Type == "" {
					continue
				}
				position := tf.Position
				if position == 0 {
					position = float64((i + 1) * 16384)
				}

				field := models.CustomField{
					ID:       uuid.New(),
					BoardID:  board.ID,
					Name:     tf.Name,
					Type:     models.CustomFieldType(tf.Type),
					Options:  pq.StringArray(tf.Options),
					Position: position,
				}
				if err := tx.Create(&field).Error; err != nil {
					return err
				}
			}

			for _, tl := range templateData.Labels {
				if tl.Name == "" {
					continue
				}
				label := models.Label{
					ID:      uuid.New(),
					BoardID: board.ID,
					Name:    tl.Name,
					Color:   tl.Color,
				}
				if label.Color == "" {
					label.Color = "#ef4444"
				}
				if err := tx.Create(&label).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create board or initialize template"})
		return
	}

	c.JSON(http.StatusCreated, board)
}

// DeleteBoard deletes a board if user has access
func (h *BoardHandler) DeleteBoard(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	// Verify ownership via Repository
	board, err := h.Repo.GetBoardByID(boardID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found or access denied"})
		return
	}

	// Delete board (soft delete via GORM)
	if err := h.DB.Delete(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete board"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Board deleted"})
}

func (h *BoardHandler) ListArchivedCards(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	// Verify access
	_, err = h.Repo.GetBoardByID(boardID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found or access denied"})
		return
	}

	var cards []models.Card
	if err := h.DB.Where("column_id IN (SELECT id FROM columns WHERE board_id = ?) AND is_archived = ?", boardID, true).
		Preload("Labels").
		Preload("Members").
		Order("archived_at DESC").
		Find(&cards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch archived cards"})
		return
	}

	c.JSON(http.StatusOK, cards)
}

func (h *BoardHandler) ToggleStar(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	// Verify ownership via Repository
	board, err := h.Repo.GetBoardByID(boardID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found or access denied"})
		return
	}

	board.IsStarred = !board.IsStarred
	if err := h.DB.Save(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle star"})
		return
	}

	if h.Hub != nil {
		h.Hub.BroadcastToRoom(board.ID.String(), "BOARD_UPDATED", map[string]interface{}{
			"board_id": board.ID.String(),
		})
	}

	c.JSON(http.StatusOK, board)
}

// UpdateBoard updates board details (Title, Background)
func (h *BoardHandler) UpdateBoard(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	// Verify ownership via Repository
	board, err := h.Repo.GetBoardByID(boardID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found or access denied"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	updates := make(map[string]interface{})
	if title, ok := req["title"].(string); ok && title != "" {
		updates["title"] = title
	}
	if color, ok := req["background_color"].(string); ok {
		updates["background_color"] = color
	}
	if imgURL, ok := req["background_image_url"].(string); ok {
		updates["background_image_url"] = imgURL
	}
	if documentationNotes, ok := req["documentation_notes"].(string); ok {
		updates["documentation_notes"] = documentationNotes
	}

	if len(updates) > 0 {
		if err := h.DB.Model(&board).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update board"})
			return
		}
	}

	if h.Hub != nil {
		h.Hub.BroadcastToRoom(board.ID.String(), "BOARD_UPDATED", map[string]interface{}{
			"board_id": board.ID.String(),
		})
	}

	c.JSON(http.StatusOK, board)
}

// UploadBoardBackground uploads a board background image
func (h *BoardHandler) UploadBoardBackground(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	// Verify access to board
	board, err := h.Repo.GetBoardByID(boardID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found or access denied"})
		return
	}

	file, header, err := c.Request.FormFile("background")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	// Validate file size (max 8MB)
	if header.Size > 8*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large. Maximum 8MB."})
		return
	}

	contentType := header.Header.Get("Content-Type")
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
	}
	if !allowedTypes[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only JPEG, PNG, and WebP are allowed."})
		return
	}

	bgDir := "./uploads/board-backgrounds"
	if err := os.MkdirAll(bgDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		switch contentType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".img"
		}
	}

	filename := fmt.Sprintf("%s_%d%s", boardID.String(), time.Now().Unix(), ext)
	filePath := filepath.Join(bgDir, filename)

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

	bgURL := "/uploads/board-backgrounds/" + filename
	if err := h.DB.Model(&board).Updates(map[string]interface{}{
		"background_image_url": bgURL,
		"background_color":     "",
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update board background"})
		return
	}

	if h.Hub != nil {
		h.Hub.BroadcastToRoom(board.ID.String(), "BOARD_UPDATED", map[string]interface{}{
			"board_id": board.ID.String(),
		})
	}

	c.JSON(http.StatusOK, gin.H{"background_image_url": bgURL})
}
