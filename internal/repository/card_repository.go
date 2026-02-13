package repository

import (
	"errors"
	"fmt"
	"nexus-backend/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CardRepository struct {
	DB *gorm.DB
}

func NewCardRepository(db *gorm.DB) *CardRepository {
	return &CardRepository{DB: db}
}

// MoveCardTransaction handles the move logic by setting the new float position.
func (r *CardRepository) MoveCardTransaction(cardID uuid.UUID, newColumnID uuid.UUID, newPosition float64) (*models.Card, error) {
	var movedCard models.Card

	err := r.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Get the card to move (Preload Column to check current board)
		var card models.Card
		if err := tx.Preload("Column").First(&card, "id = ?", cardID).Error; err != nil {
			return err
		}

		// 2. Validate Target Column exists
		var targetCol models.Column
		if err := tx.First(&targetCol, "id = ?", newColumnID).Error; err != nil {
			return errors.New("target column not found")
		}

		// 3. Simple Check for same position/column - do nothing
		if card.ColumnID == newColumnID && card.Position == newPosition {
			movedCard = card
			return nil
		}

		// 4. Handle Cross-Board Move: Clear Labels
		// Labels are board-specific. If moving to a new board, original labels are invalid.
		if card.Column.BoardID != targetCol.BoardID {
			if err := tx.Model(&card).Association("Labels").Clear(); err != nil {
				return fmt.Errorf("failed to clear labels during cross-board move: %w", err)
			}
		}

		// 5. Update the Card
		if err := tx.Model(&models.Card{}).Where("id = ?", cardID).Updates(map[string]interface{}{
			"column_id":   newColumnID,
			"position":    newPosition,
			"is_archived": false,
			"archived_at": nil,
		}).Error; err != nil {
			return err
		}

		// Reload to ensure fresh relations
		if err := tx.Preload("Column").First(&movedCard, "id = ?", cardID).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("transaction failed: %w", err)
	}

	return &movedCard, nil
}

// Basic CRUD methods
func (r *CardRepository) Create(card *models.Card) error {
	return r.DB.Create(card).Error
}

func (r *CardRepository) Update(card *models.Card) error {
	return r.DB.Save(card).Error
}

func (r *CardRepository) Archive(id uuid.UUID) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		var card models.Card
		if err := tx.First(&card, "id = ?", id).Error; err != nil {
			return err
		}

		if card.IsArchived {
			return nil // Already archived
		}

		now := time.Now()
		return tx.Model(&card).Updates(map[string]interface{}{
			"is_archived": true,
			"archived_at": &now,
			"position":    -1,
		}).Error
	})
}

func (r *CardRepository) Restore(id uuid.UUID, columnID uuid.UUID) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		var card models.Card
		if err := tx.First(&card, "id = ?", id).Error; err != nil {
			return err
		}

		if !card.IsArchived {
			return nil // Not archived
		}

		// Get max position in target column
		var result struct{ Max float64 }
		var count int64
		tx.Model(&models.Card{}).Where("column_id = ? AND is_archived = false", columnID).Count(&count)
		pos := 0.0
		if count > 0 {
			tx.Model(&models.Card{}).Where("column_id = ? AND is_archived = false", columnID).Select("MAX(position) as max").Scan(&result)
			pos = result.Max + 1
		}

		return tx.Model(&card).Updates(map[string]interface{}{
			"is_archived": false,
			"archived_at": nil,
			"column_id":   columnID,
			"position":    pos,
		}).Error
	})
}

func (r *CardRepository) Delete(id uuid.UUID) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		var card models.Card
		if err := tx.First(&card, "id = ?", id).Error; err != nil {
			return err
		}

		// 1. Manually clear many-to-many junction table records
		// GORM OnDelete:CASCADE on the model doesn't always handle M2M junction tables automatically
		// if the database wasn't initialized with explicit foreign key constraints on the junction table.
		if err := tx.Model(&card).Association("Labels").Clear(); err != nil {
			return err
		}
		if err := tx.Model(&card).Association("Members").Clear(); err != nil {
			return err
		}

		// 2. Perform the actual delete
		return tx.Delete(&card).Error
	})
}

func (r *CardRepository) FindByID(id uuid.UUID) (*models.Card, error) {
	var card models.Card
	err := r.DB.First(&card, "id = ?", id).Error
	return &card, err
}

// FindByIDWithChecklists returns a card with checklists, items, labels, and members preloaded
func (r *CardRepository) FindByIDWithChecklists(id uuid.UUID) (*models.Card, error) {
	var card models.Card
	err := r.DB.Preload("Checklists", func(db *gorm.DB) *gorm.DB {
		return db.Order("position ASC")
	}).Preload("Checklists.Items", func(db *gorm.DB) *gorm.DB {
		return db.Order("position ASC")
	}).Preload("Comments", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).Preload("Comments.User").Preload("Labels").Preload("Members").Preload("Column").Preload("Attachments").First(&card, "id = ?", id).Error
	return &card, err
}

// Metadata Association Methods
func (r *CardRepository) AddLabel(cardID, labelID uuid.UUID) error {
	return r.DB.Model(&models.Card{ID: cardID}).Association("Labels").Append(&models.Label{ID: labelID})
}

func (r *CardRepository) RemoveLabel(cardID, labelID uuid.UUID) error {
	return r.DB.Model(&models.Card{ID: cardID}).Association("Labels").Delete(&models.Label{ID: labelID})
}

func (r *CardRepository) AddMember(cardID, userID uuid.UUID) error {
	return r.DB.Model(&models.Card{ID: cardID}).Association("Members").Append(&models.User{ID: userID})
}

func (r *CardRepository) RemoveMember(cardID, userID uuid.UUID) error {
	return r.DB.Model(&models.Card{ID: cardID}).Association("Members").Delete(&models.User{ID: userID})
}

func (r *CardRepository) GetMaxPosition(columnID uuid.UUID) float64 {
	var result struct{ Max float64 }
	var count int64
	r.DB.Model(&models.Card{}).Where("column_id = ? AND is_archived = false", columnID).Count(&count)
	if count == 0 {
		return 0
	}
	r.DB.Model(&models.Card{}).Where("column_id = ? AND is_archived = false", columnID).Select("MAX(position) as max").Scan(&result)
	return result.Max + 16384.0 // Next position with large gap
}

// CopyCard creates a deep copy of a card
func (r *CardRepository) CopyCard(originalCardID, targetColumnID uuid.UUID, targetPosition float64) (*models.Card, error) {
	var originalCard models.Card
	// Fetch with all relations (Including Column to check board_id)
	if err := r.DB.Preload("Column").
		Preload("Checklists.Items").
		Preload("Labels").
		Preload("Members").
		Preload("Attachments").
		First(&originalCard, "id = ?", originalCardID).Error; err != nil {
		return nil, err
	}

	// Fetch Target Column to check its board
	var targetCol models.Column
	if err := r.DB.First(&targetCol, "id = ?", targetColumnID).Error; err != nil {
		return nil, errors.New("target column not found")
	}

	// 1. Create Base Card
	newCard := models.Card{
		ID:          uuid.New(),
		Title:       originalCard.Title, // Keep original title
		Description: originalCard.Description,
		ColumnID:    targetColumnID,
		Position:    targetPosition,
		DueDate:     originalCard.DueDate,
		IsComplete:  false, // Reset completion? Trello keeps it. Let's keep it.
		// Attachments? Cover?
	}
	if originalCard.IsComplete {
		newCard.IsComplete = true
	}

	err := r.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&newCard).Error; err != nil {
			return err
		}

		// 2. Copy Checklists
		for _, cl := range originalCard.Checklists {
			newCL := models.Checklist{
				ID:       uuid.New(),
				CardID:   newCard.ID,
				Title:    cl.Title,
				Position: cl.Position,
			}
			if err := tx.Create(&newCL).Error; err != nil {
				return err
			}

			// Copy Items
			for _, item := range cl.Items {
				newItem := models.ChecklistItem{
					ID:          uuid.New(),
					ChecklistID: newCL.ID,
					Title:       item.Title,
					IsCompleted: item.IsCompleted,
					Position:    item.Position,
				}
				if err := tx.Create(&newItem).Error; err != nil {
					return err
				}
			}
		}

		// 3. Copy Attachments (Records only, pointing to same files)
		for _, att := range originalCard.Attachments {
			newAtt := models.Attachment{
				ID:       uuid.New(),
				CardID:   newCard.ID,
				UserID:   att.UserID, // Original uploader
				Filename: att.Filename,
				FilePath: att.FilePath,
				FileType: att.FileType,
				Size:     att.Size,
			}
			if err := tx.Create(&newAtt).Error; err != nil {
				return err
			}
			// Handle Cover
			if originalCard.CoverAttachmentID != nil && *originalCard.CoverAttachmentID == att.ID {
				// We can't set it yet? Or we can update newCard after.
				// Easier to update newCard after we know the newAtt.ID
				copyID := newAtt.ID
				tx.Model(&newCard).Update("cover_attachment_id", copyID)
			}
		}

		// 4. Copy Members (Associations)
		if len(originalCard.Members) > 0 {
			if err := tx.Model(&newCard).Association("Members").Replace(originalCard.Members); err != nil {
				return err
			}
		}

		// 5. Copy Labels (Associations) - ONLY if SAME BOARD.
		// Labels are board-specific.
		if len(originalCard.Labels) > 0 && originalCard.Column.BoardID == targetCol.BoardID {
			if err := tx.Model(&newCard).Association("Labels").Replace(originalCard.Labels); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Reload to return full object
	return r.FindByIDWithChecklists(newCard.ID)
}

func (r *CardRepository) FindTemplatesByBoardID(boardID uuid.UUID) ([]models.Card, error) {
	var cards []models.Card
	err := r.DB.Where("is_template = ? AND column_id IN (SELECT id FROM columns WHERE board_id = ?)", true, boardID).
		Preload("Labels").
		Preload("Members").
		Order("template_name ASC").
		Find(&cards).Error
	return cards, err
}
