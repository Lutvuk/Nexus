package repository

import (
	"nexus-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AutomationRepository interface {
	CreateRule(rule *models.AutomationRule) error
	GetRulesByBoard(boardID uuid.UUID) ([]models.AutomationRule, error)
	DeleteRule(id uuid.UUID) error
	GetRuleByID(id uuid.UUID) (*models.AutomationRule, error)
	ToggleRule(id uuid.UUID) error
}

type automationRepository struct {
	db *gorm.DB
}

func NewAutomationRepository(db *gorm.DB) AutomationRepository {
	return &automationRepository{db: db}
}

func (r *automationRepository) CreateRule(rule *models.AutomationRule) error {
	return r.db.Create(rule).Error
}

func (r *automationRepository) GetRulesByBoard(boardID uuid.UUID) ([]models.AutomationRule, error) {
	var rules []models.AutomationRule
	err := r.db.Where("board_id = ?", boardID).Find(&rules).Error
	return rules, err
}

func (r *automationRepository) DeleteRule(id uuid.UUID) error {
	return r.db.Delete(&models.AutomationRule{}, "id = ?", id).Error
}

func (r *automationRepository) GetRuleByID(id uuid.UUID) (*models.AutomationRule, error) {
	var rule models.AutomationRule
	err := r.db.First(&rule, "id = ?", id).Error
	return &rule, err
}

func (r *automationRepository) ToggleRule(id uuid.UUID) error {
	return r.db.Model(&models.AutomationRule{}).
		Where("id = ?", id).
		Update("is_active", gorm.Expr("NOT is_active")).Error
}
