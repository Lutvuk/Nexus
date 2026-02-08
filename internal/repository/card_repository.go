package repository

import (
	"errors"
	"fmt"
	"nexus-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CardRepository struct {
	DB *gorm.DB
}

func NewCardRepository(db *gorm.DB) *CardRepository {
	return &CardRepository{DB: db}
}

// MoveCardTransaction handles the complex move logic with ACID compliance
func (r *CardRepository) MoveCardTransaction(cardID uuid.UUID, newColumnID uuid.UUID, newPosition int) (*models.Card, error) {
	var movedCard models.Card

	err := r.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Get the card to move
		var card models.Card
		if err := tx.First(&card, "id = ?", cardID).Error; err != nil {
			return err
		}

		oldColumnID := card.ColumnID
		oldPosition := card.Position

		// 2. Validate Target Column exists
		var targetCol models.Column
		if err := tx.First(&targetCol, "id = ?", newColumnID).Error; err != nil {
			return errors.New("target column not found")
		}
		
		// 3. Simple Check for same position - do nothing
		if oldColumnID == newColumnID && oldPosition == newPosition {
			movedCard = card
			return nil
		}

		// 4. Move card to temporary position to avoid collision/constraint issues
		// This is crucial if there is a unique constraint on (column_id, position)
		if err := tx.Model(&card).Update("position", -1).Error; err != nil {
			return err
		}

		// 5. Shift Logic (Iterative to avoid Unique Constraint collisions in SQLite)
		// Case A: Same Column
		if oldColumnID == newColumnID {
			if newPosition > oldPosition {
				// Moving Down: Shift items between old and new UP (-1) (Closing Gap at oldPosition)
				// Order: ASC (1->0, then 2->1)
				var cardsToShift []models.Card
				if err := tx.Where("column_id = ? AND position > ? AND position <= ?", oldColumnID, oldPosition, newPosition).
					Order("position asc").Find(&cardsToShift).Error; err != nil {
					return err
				}
				for _, c := range cardsToShift {
					if err := tx.Model(&c).Update("position", c.Position-1).Error; err != nil {
						return err
					}
				}
			} else {
				// Moving Up: Shift items between new and old DOWN (+1) (Opening Gap at newPosition)
				// Order: DESC (2->3, then 1->2)
				var cardsToShift []models.Card
				if err := tx.Where("column_id = ? AND position >= ? AND position < ?", oldColumnID, newPosition, oldPosition).
					Order("position desc").Find(&cardsToShift).Error; err != nil {
					return err
				}
				for _, c := range cardsToShift {
					if err := tx.Model(&c).Update("position", c.Position+1).Error; err != nil {
						return err
					}
				}
			}
		} else {
			// Case B: Different Columns
			
			// 1. Shift Old Column: Close the gap (at oldPosition)
			// Order: ASC
			var oldCols []models.Card
			if err := tx.Where("column_id = ? AND position > ?", oldColumnID, oldPosition).
				Order("position asc").Find(&oldCols).Error; err != nil {
				return err
			}
			for _, c := range oldCols {
				if err := tx.Model(&c).Update("position", c.Position-1).Error; err != nil {
					return err
				}
			}

			// 2. Shift New Column: Open a slot (at newPosition)
			// Order: DESC
			var newCols []models.Card
			if err := tx.Where("column_id = ? AND position >= ?", newColumnID, newPosition).
				Order("position desc").Find(&newCols).Error; err != nil {
				return err
			}
			for _, c := range newCols {
				if err := tx.Model(&c).Update("position", c.Position+1).Error; err != nil {
					return err
				}
			}
		}

		// 6. Update the Card itself to final destination
		card.ColumnID = newColumnID
		card.Position = newPosition
		
		if err := tx.Save(&card).Error; err != nil {
			return err
		}
		
		movedCard = card
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

func (r *CardRepository) Delete(id uuid.UUID) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		var card models.Card
		if err := tx.First(&card, "id = ?", id).Error; err != nil {
			return err
		}
		
		// Shift remaining cards in column
		if err := tx.Model(&models.Card{}).
			Where("column_id = ? AND position > ?", card.ColumnID, card.Position).
			Update("position", gorm.Expr("position - 1")).Error; err != nil {
			return err
		}
		
		return tx.Delete(&card).Error
	})
}

func (r *CardRepository) FindByID(id uuid.UUID) (*models.Card, error) {
	var card models.Card
	err := r.DB.First(&card, "id = ?", id).Error
	return &card, err
}

func (r *CardRepository) GetMaxPosition(columnID uuid.UUID) int {
	var result struct{ Max int }
	var count int64
	r.DB.Model(&models.Card{}).Where("column_id = ?", columnID).Count(&count)
	if count == 0 {
		return 0
	}
	r.DB.Model(&models.Card{}).Where("column_id = ?", columnID).Select("MAX(position) as max").Scan(&result)
	return result.Max + 1 // Next position
}
