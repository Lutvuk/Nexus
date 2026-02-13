package services

import (
	"errors"
	"time"

	"nexus-backend/internal/models"
	"nexus-backend/internal/repository"

	"github.com/google/uuid"
)

type CustomFieldService struct {
	Repo *repository.CustomFieldRepository
}

func NewCustomFieldService(repo *repository.CustomFieldRepository) *CustomFieldService {
	return &CustomFieldService{Repo: repo}
}

func (s *CustomFieldService) CreateField(boardID uuid.UUID, name string, fieldType models.CustomFieldType, options []string) (*models.CustomField, error) {
	field := &models.CustomField{
		BoardID: boardID,
		Name:    name,
		Type:    fieldType,
		Options: options,
	}

	// Simple position logic: put at end
	existing, _ := s.Repo.GetFieldsByBoardID(boardID)
	field.Position = float64((len(existing) + 1) * 1000)

	err := s.Repo.CreateField(field)
	return field, err
}

func (s *CustomFieldService) GetFields(boardID uuid.UUID) ([]models.CustomField, error) {
	return s.Repo.GetFieldsByBoardID(boardID)
}

func (s *CustomFieldService) DeleteField(id uuid.UUID) error {
	// Clear dependent card values first to avoid FK constraint failures.
	if err := s.Repo.DeleteValuesByFieldID(id); err != nil {
		return err
	}
	return s.Repo.DeleteField(id)
}

func (s *CustomFieldService) SetCardValue(cardID uuid.UUID, fieldID uuid.UUID, value interface{}) (*models.CardCustomFieldValue, error) {
	// 1. Get Field Definition to know type
	field, err := s.Repo.GetFieldByID(fieldID)
	if err != nil {
		return nil, errors.New("field not found")
	}

	// 2. Prepare Value Struct
	val := &models.CardCustomFieldValue{
		CardID:        cardID,
		CustomFieldID: fieldID,
	}

	// 3. Map value based on type
	switch field.Type {
	case models.FieldTypeText, models.FieldTypeDropdown:
		strVal, ok := value.(string)
		if !ok {
			return nil, errors.New("invalid value type for text/dropdown field")
		}
		val.ValueText = strVal
	case models.FieldTypeNumber:
		numVal, ok := value.(float64)
		if !ok {
			// Try int conversion if JSON sends ints
			if intVal, okInt := value.(int); okInt {
				numVal = float64(intVal)
			} else {
				return nil, errors.New("invalid value type for number field")
			}
		}
		val.ValueNumber = numVal
	case models.FieldTypeCheckbox:
		boolVal, ok := value.(bool)
		if !ok {
			return nil, errors.New("invalid value type for checkbox field")
		}
		val.ValueBool = boolVal
	case models.FieldTypeDate:
		// Expect ISO string or nil
		if value == nil {
			val.ValueDate = nil
		} else {
			strVal, ok := value.(string)
			if !ok {
				return nil, errors.New("invalid value type for date field")
			}
			t, err := time.Parse(time.RFC3339, strVal)
			if err != nil {
				return nil, errors.New("invalid date format")
			}
			val.ValueDate = &t
		}
	}

	err = s.Repo.SetValue(val)
	return val, err
}

func (s *CustomFieldService) GetCardValues(cardID uuid.UUID) ([]models.CardCustomFieldValue, error) {
	return s.Repo.GetValuesByCardID(cardID)
}
