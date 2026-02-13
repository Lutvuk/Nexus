package repository

import (
	"nexus-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BoardRepository struct {
	DB *gorm.DB
}

func NewBoardRepository(db *gorm.DB) *BoardRepository {
	return &BoardRepository{DB: db}
}

// GetBoardsByUserID fetches all boards for a user across all their workspaces (owned and shared)
func (r *BoardRepository) GetBoardsByUserID(userID uuid.UUID) ([]models.Board, error) {
	var boards []models.Board

	// Subquery: Workspaces owned by user OR shared with user (accepted only)
	subQuery := r.DB.Table("workspaces").Select("id").
		Where("owner_id = ?", userID).
		Or("id IN (?)", r.DB.Table("workspace_members").Select("workspace_id").Where("user_id = ? AND status = 'accepted'", userID))

	err := r.DB.Where("workspace_id IN (?)", subQuery).
		Order("updated_at DESC").
		Find(&boards).Error

	return boards, err
}

// GetBoardByID fetches a specific board if the user has access (owner or member)
func (r *BoardRepository) GetBoardByID(boardID uuid.UUID, userID uuid.UUID) (*models.Board, error) {
	var board models.Board

	// Subquery: Workspaces owned by user OR shared with user (accepted only)
	subQuery := r.DB.Table("workspaces").Select("id").
		Where("owner_id = ?", userID).
		Or("id IN (?)", r.DB.Table("workspace_members").Select("workspace_id").Where("user_id = ? AND status = 'accepted'", userID))

	err := r.DB.Where("id = ? AND workspace_id IN (?)", boardID, subQuery).
		First(&board).Error
	return &board, err
}

// CreateBoard creates a board in a specific workspace
func (r *BoardRepository) CreateBoard(board *models.Board) error {
	return r.DB.Create(board).Error
}
