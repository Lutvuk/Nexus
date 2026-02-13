package services

import (
	"nexus-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CommentService struct {
	DB              *gorm.DB
	ActivityService *ActivityService
}

func NewCommentService(db *gorm.DB, activityService *ActivityService) *CommentService {
	return &CommentService{
		DB:              db,
		ActivityService: activityService,
	}
}

func (s *CommentService) CreateComment(cardID, userID uuid.UUID, content string) (*models.Comment, error) {
	comment := models.Comment{
		CardID:  cardID,
		UserID:  userID,
		Content: content,
	}

	if err := s.DB.Create(&comment).Error; err != nil {
		return nil, err
	}

	// Fetch Created Comment with User
	if err := s.DB.Preload("User").First(&comment, "id = ?", comment.ID).Error; err != nil {
		return nil, err
	}

	// Log Activity
	// Need BoardID. Fetch Card -> Column -> BoardID is inefficient but necessary if not passed.
	// Optionally, we can fetch Card first.
	var card models.Card
	if err := s.DB.Preload("Column").First(&card, "id = ?", cardID).Error; err == nil {
		s.ActivityService.LogActivity(userID, card.Column.BoardID, "commented_on_card", cardID, map[string]interface{}{
			"cardTitle": card.Title,
			"comment":   content,
		})
	}

	return &comment, nil
}

func (s *CommentService) DeleteComment(commentID, userID uuid.UUID) error {
	var comment models.Comment
	if err := s.DB.First(&comment, "id = ?", commentID).Error; err != nil {
		return err
	}

	// Check author ownership
	if comment.UserID == userID {
		return s.DB.Delete(&comment).Error
	}

	// Not the author, check if admin or owner of the workspace
	var workspaceInfo struct {
		WorkspaceID uuid.UUID
		OwnerID     uuid.UUID
	}

	err := s.DB.Table("workspaces").
		Select("workspaces.id as workspace_id, workspaces.owner_id").
		Joins("JOIN boards ON boards.workspace_id = workspaces.id").
		Joins("JOIN columns ON columns.board_id = boards.id").
		Joins("JOIN cards ON cards.column_id = columns.id").
		Where("cards.id = ?", comment.CardID).
		Scan(&workspaceInfo).Error

	if err == nil {
		// Is workspace owner?
		if workspaceInfo.OwnerID == userID {
			return s.DB.Delete(&comment).Error
		}

		// Is workspace admin?
		var member models.WorkspaceMember
		if err := s.DB.Where("workspace_id = ? AND user_id = ? AND role = 'admin'", workspaceInfo.WorkspaceID, userID).First(&member).Error; err == nil {
			return s.DB.Delete(&comment).Error
		}
	}

	return gorm.ErrInvalidData // Unauthorized
}

func (s *CommentService) UpdateComment(commentID, userID uuid.UUID, content string) (*models.Comment, error) {
	var comment models.Comment
	if err := s.DB.First(&comment, "id = ?", commentID).Error; err != nil {
		return nil, err
	}

	if comment.UserID != userID {
		return nil, gorm.ErrInvalidData
	}

	comment.Content = content
	if err := s.DB.Save(&comment).Error; err != nil {
		return nil, err
	}

	return &comment, nil
}
