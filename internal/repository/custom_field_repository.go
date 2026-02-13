package repository

import (
	"nexus-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CustomFieldRepository struct {
	DB *gorm.DB
}

func NewCustomFieldRepository(db *gorm.DB) *CustomFieldRepository {
	return &CustomFieldRepository{DB: db}
}

// Fields (Definitions)

func (r *CustomFieldRepository) CreateField(field *models.CustomField) error {
	return r.DB.Create(field).Error
}

func (r *CustomFieldRepository) GetFieldsByBoardID(boardID uuid.UUID) ([]models.CustomField, error) {
	var fields []models.CustomField
	err := r.DB.Where("board_id = ?", boardID).Order("position ASC").Find(&fields).Error
	return fields, err
}

func (r *CustomFieldRepository) UpdateField(field *models.CustomField) error {
	return r.DB.Save(field).Error
}

func (r *CustomFieldRepository) DeleteField(id uuid.UUID) error {
	return r.DB.Delete(&models.CustomField{}, id).Error
}

func (r *CustomFieldRepository) DeleteValuesByFieldID(fieldID uuid.UUID) error {
	// CardCustomFieldValue uses gorm.DeletedAt, so use hard delete to truly remove FK rows.
	return r.DB.Unscoped().Where("custom_field_id = ?", fieldID).Delete(&models.CardCustomFieldValue{}).Error
}

func (r *CustomFieldRepository) GetFieldByID(id uuid.UUID) (*models.CustomField, error) {
	var field models.CustomField
	err := r.DB.First(&field, "id = ?", id).Error
	return &field, err
}

// Values (Card Data)

func (r *CustomFieldRepository) SetValue(value *models.CardCustomFieldValue) error {
	// Upsert logic: If exists for (CardID, FieldID), update it. Else create.
	// GORM's Clauses.OnConflict is perfect here.
	// But first, let's just try to find existing and update, or create.
	var existing models.CardCustomFieldValue
	err := r.DB.Where("card_id = ? AND custom_field_id = ?", value.CardID, value.CustomFieldID).First(&existing).Error

	if err == nil {
		// Update existing
		value.ID = existing.ID
		return r.DB.Save(value).Error
	} else if err == gorm.ErrRecordNotFound {
		// Create new
		return r.DB.Create(value).Error
	}
	return err
}

func (r *CustomFieldRepository) DeleteValue(id uuid.UUID) error {
	return r.DB.Delete(&models.CardCustomFieldValue{}, id).Error
}

func (r *CustomFieldRepository) GetValuesByCardID(cardID uuid.UUID) ([]models.CardCustomFieldValue, error) {
	var values []models.CardCustomFieldValue
	// Preload definition to get Name/Type
	err := r.DB.Preload("CustomField").Where("card_id = ?", cardID).Find(&values).Error
	return values, err
}
