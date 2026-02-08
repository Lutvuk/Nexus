package repository

import (
	"log"
	"nexus-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SeedData(db *gorm.DB) {
	var count int64
	db.Model(&models.Column{}).Count(&count)
	if count > 0 {
		log.Println("Database already seeded")
		return
	}

	log.Println("Seeding database...")

	// Fixed UUIDs as per stories.md
	planID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	progressID := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	completeID := uuid.MustParse("00000000-0000-0000-0000-000000000003")

	columns := []models.Column{
		{ID: planID, Name: "Plan", Position: 0},
		{ID: progressID, Name: "Progress", Position: 1},
		{ID: completeID, Name: "Complete", Position: 2},
	}

	if err := db.Create(&columns).Error; err != nil {
		log.Printf("Error seeding columns: %v", err)
		return
	}

	cards := []models.Card{
		{
			Title:       "Design glassmorphism UI",
			Description: "Purple theme #8B5CF6 + backdrop blur",
			ColumnID:    planID,
			Position:    0,
		},
		{
			Title:       "Setup Angular CDK",
			Description: "DragDropModule + connected lists",
			ColumnID:    planID,
			Position:    1,
		},
		{
			Title:       "Go Gin backend",
			Description: "REST API + GORM transactions",
			ColumnID:    progressID,
			Position:    0,
		},
		{
			Title:       "Docker compose",
			Description: "Postgres + Go API local dev",
			ColumnID:    completeID,
			Position:    0,
		},
		{
			Title:       "PRD & FSD documentation",
			Description: "Full technical specification",
			ColumnID:    completeID,
			Position:    1,
		},
		{
			Title:       "ERD & API Contract",
			Description: "Database and endpoint design",
			ColumnID:    completeID,
			Position:    2,
		},
	}

	if err := db.Create(&cards).Error; err != nil {
		log.Printf("Error seeding cards: %v", err)
		return
	}

	log.Println("Seeding complete")
}
