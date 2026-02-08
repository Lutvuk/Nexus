package services_test

import (
	"nexus-backend/internal/models"
	"nexus-backend/internal/repository"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// SetupTestDB creates an in-memory SQLite DB for testing using Pure Go driver
func SetupTestDB() *gorm.DB {
	// Use pure Go sqlite driver
	db, _ := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	db.AutoMigrate(&models.Column{}, &models.Card{})
	
	// Clean data to prevent test pollution	// Clean data by dropping tables to ensure fresh schema (no lingering indexes)
	db.Migrator().DropTable(&models.Card{})
	db.Migrator().DropTable(&models.Column{})
	db.AutoMigrate(&models.Column{}, &models.Card{})
	return db
}

func TestMoveCard_DifferentColumns(t *testing.T) {
	db := SetupTestDB()
	repo := repository.NewCardRepository(db)
	
	col1 := uuid.New()
	col2 := uuid.New()
	
	c1ID := uuid.New()
	c2ID := uuid.New()
	c3ID := uuid.New()
	c4ID := uuid.New()
	
	db.Create(&models.Column{ID: col1, Name: "Col1", Position: 0})
	db.Create(&models.Column{ID: col2, Name: "Col2", Position: 1})
	
	// Col1: [A:0, B:1, C:2]
	db.Create(&models.Card{ID: c1ID, Title: "A", ColumnID: col1, Position: 0})
	db.Create(&models.Card{ID: c2ID, Title: "B", ColumnID: col1, Position: 1})
	db.Create(&models.Card{ID: c3ID, Title: "C", ColumnID: col1, Position: 2})
	// Col2: [D:0]
	db.Create(&models.Card{ID: c4ID, Title: "D", ColumnID: col2, Position: 0})
	
	// Move B -> Col2 pos 0
	moved, err := repo.MoveCardTransaction(c2ID, col2, 0)
	
	require.Nil(t, err)
	t.Log("DifferentColumns Move Success")
	assert.Equal(t, col2, moved.ColumnID)
	assert.Equal(t, 0, moved.Position)
	
	// Verify Col1: C should shift down to 1
	var c3 models.Card
	db.First(&c3, "id = ?", c3ID)
	assert.Equal(t, 1, c3.Position, "Card C should shift down to 1")
	
	// Verify Col2: D should shift up to 1
	var c4 models.Card
	db.First(&c4, "id = ?", c4ID)
	assert.Equal(t, 1, c4.Position, "Card D should shift up to 1")
}

func TestMoveCard_SameColumn_Down(t *testing.T) {
	db := SetupTestDB()
	repo := repository.NewCardRepository(db)
	col1 := uuid.New()
	db.Create(&models.Column{ID: col1, Name: "Col1", Position: 0})
	
	// [A:0, B:1, C:2] -> Move A(0) to 2 -> [B:0, C:1, A:2]
	a := uuid.New()
	b := uuid.New()
	c := uuid.New()
	
	db.Create(&models.Card{ID: a, Title: "A", ColumnID: col1, Position: 0})
	db.Create(&models.Card{ID: b, Title: "B", ColumnID: col1, Position: 1})
	db.Create(&models.Card{ID: c, Title: "C", ColumnID: col1, Position: 2})
	
	_, err := repo.MoveCardTransaction(a, col1, 2)
	require.Nil(t, err)
	
	var cardA, cardB, cardC models.Card
	db.First(&cardA, "id = ?", a)
	db.First(&cardB, "id = ?", b)
	db.First(&cardC, "id = ?", c)
	
	assert.Equal(t, 2, cardA.Position)
	assert.Equal(t, 0, cardB.Position)
	assert.Equal(t, 1, cardC.Position)
}
