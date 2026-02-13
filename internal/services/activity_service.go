package services

import (
	"encoding/json"
	"nexus-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ActivityService struct {
	DB *gorm.DB
}

func NewActivityService(db *gorm.DB) *ActivityService {
	return &ActivityService{DB: db}
}

// LogActivity records a new activity
func (s *ActivityService) LogActivity(userID uuid.UUID, boardID uuid.UUID, action string, targetID uuid.UUID, metadata map[string]interface{}) error {
	metaJSON, _ := json.Marshal(metadata)

	activity := models.Activity{
		UserID:   userID,
		BoardID:  boardID,
		Action:   action,
		TargetID: targetID,
		Metadata: datatypes.JSON(metaJSON),
	}

	return s.DB.Create(&activity).Error
}

// GetBoardActivity returns recent activity for a board
func (s *ActivityService) GetBoardActivity(boardID uuid.UUID, limit int) ([]models.Activity, error) {
	var activities []models.Activity
	err := s.DB.Where("board_id = ?", boardID).
		Preload("User").
		Order("created_at desc").
		Limit(limit).
		Find(&activities).Error
	return activities, err
}

// GetCardActivity returns activity specific to a card (target_id)
func (s *ActivityService) GetCardActivity(cardID uuid.UUID) ([]models.Activity, error) {
	var activities []models.Activity
	err := s.DB.Where("target_id = ?", cardID).
		Preload("User").
		Order("created_at desc").
		Find(&activities).Error
	return activities, err
}
