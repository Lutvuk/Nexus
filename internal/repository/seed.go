package repository

import (
	"log"
	"nexus-backend/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func SeedData(db *gorm.DB) {
	SeedTemplates(db)
	var count int64
	db.Model(&models.Column{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("Seeding database...")

	// Fixed UUIDs as per stories.md
	planID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	progressID := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	completeID := uuid.MustParse("00000000-0000-0000-0000-000000000003")

	columns := []models.Column{
		{ID: planID, Name: "Plan", Position: 16384.0},
		{ID: progressID, Name: "Progress", Position: 32768.0},
		{ID: completeID, Name: "Complete", Position: 49152.0},
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
			Position:    16384.0,
		},
		{
			Title:       "Setup Angular CDK",
			Description: "DragDropModule + connected lists",
			ColumnID:    planID,
			Position:    32768.0,
		},
		{
			Title:       "Go Gin backend",
			Description: "REST API + GORM transactions",
			ColumnID:    progressID,
			Position:    16384.0,
		},
		{
			Title:       "Docker compose",
			Description: "Postgres + Go API local dev",
			ColumnID:    completeID,
			Position:    16384.0,
		},
		{
			Title:       "PRD & FSD documentation",
			Description: "Full technical specification",
			ColumnID:    completeID,
			Position:    32768.0,
		},
		{
			Title:       "ERD & API Contract",
			Description: "Database and endpoint design",
			ColumnID:    completeID,
			Position:    49152.0,
		},
	}

	if err := db.Create(&cards).Error; err != nil {
		log.Printf("Error seeding cards: %v", err)
		return
	}

	log.Println("Seeding complete")
}

func SeedTemplates(db *gorm.DB) {
	templates := []models.BoardTemplate{
		{
			ID:          uuid.New(),
			Name:        "Kanban",
			Description: "Classic To Do, In Progress, Done flow",
			Category:    "Software Development",
			Data: datatypes.JSON([]byte(`{
				"columns": [
					{"name": "To Do", "position": 16384},
					{"name": "In Progress", "position": 32768},
					{"name": "Review", "position": 49152},
					{"name": "Done", "position": 65536}
				],
				"custom_fields": [
					{"name": "Story Points", "type": "number", "position": 16384},
					{"name": "Priority", "type": "dropdown", "options": ["Critical", "High", "Medium", "Low"], "position": 32768},
					{"name": "Sprint", "type": "text", "position": 49152}
				],
				"labels": [
					{"name": "Urgent", "color": "#ef4444"},
					{"name": "Bug", "color": "#f97316"},
					{"name": "Feature", "color": "#22c55e"}
				]
			}`)),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          uuid.New(),
			Name:        "Sprint",
			Description: "Backlog, Sprint, Review, Done",
			Category:    "Agile",
			Data: datatypes.JSON([]byte(`{
				"columns": [
					{"name": "Backlog", "position": 16384},
					{"name": "Current Sprint", "position": 32768},
					{"name": "Review", "position": 49152},
					{"name": "Done", "position": 65536}
				],
				"custom_fields": [
					{"name": "Story Points", "type": "number", "position": 16384},
					{"name": "Sprint Goal", "type": "text", "position": 32768},
					{"name": "Priority", "type": "dropdown", "options": ["Critical", "High", "Medium", "Low"], "position": 49152}
				],
				"labels": [
					{"name": "Urgent", "color": "#ef4444"},
					{"name": "Technical Debt", "color": "#8b5cf6"}
				]
			}`)),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          uuid.New(),
			Name:        "Content Pipeline",
			Description: "Idea, Draft, Review, Published",
			Category:    "Marketing",
			Data:        datatypes.JSON([]byte(`{"columns": [{"name": "Brainstorming", "position": 16384}, {"name": "Drafting", "position": 32768}, {"name": "Approval", "position": 49152}, {"name": "Published", "position": 65536}]}`)),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New(),
			Name:        "Design Workflow",
			Description: "Backlog, In Design, Ready for Review, Approved",
			Category:    "Design",
			Data:        datatypes.JSON([]byte(`{"columns": [{"name": "Backlog", "position": 16384}, {"name": "In Design", "position": 32768}, {"name": "Ready for Review", "position": 49152}, {"name": "Approved", "position": 65536}]}`)),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New(),
			Name:        "Bug Triage",
			Description: "Reported, Reproduced, Fixing, Verification, Closed",
			Category:    "Software Development",
			Data: datatypes.JSON([]byte(`{
				"columns": [
					{"name": "Reported", "position": 16384},
					{"name": "Reproduced", "position": 32768},
					{"name": "Fixing", "position": 49152},
					{"name": "Verification", "position": 65536},
					{"name": "Blocked", "position": 81920},
					{"name": "Closed", "position": 98304}
				],
				"custom_fields": [
					{"name": "Severity", "type": "dropdown", "options": ["Blocker", "Critical", "Major", "Minor", "Trivial"], "position": 16384},
					{"name": "Priority", "type": "dropdown", "options": ["P0", "P1", "P2", "P3"], "position": 32768},
					{"name": "Bug Type", "type": "dropdown", "options": ["Functional", "UI/UX", "Performance", "Security", "Regression"], "position": 49152},
					{"name": "Reproducible", "type": "checkbox", "position": 65536}
				],
				"labels": [
					{"name": "Urgent", "color": "#ef4444"},
					{"name": "Regression", "color": "#f59e0b"},
					{"name": "Backend", "color": "#3b82f6"}
				]
			}`)),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          uuid.New(),
			Name:        "Product Roadmap",
			Description: "Ideas, Discovery, Planned, Building, Released",
			Category:    "Product",
			Data:        datatypes.JSON([]byte(`{"columns": [{"name": "Ideas", "position": 16384}, {"name": "Discovery", "position": 32768}, {"name": "Planned", "position": 49152}, {"name": "Building", "position": 65536}, {"name": "Released", "position": 81920}]}`)),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New(),
			Name:        "Recruiting Pipeline",
			Description: "Sourcing, Screening, Interview, Offer, Hired",
			Category:    "HR",
			Data:        datatypes.JSON([]byte(`{"columns": [{"name": "Sourcing", "position": 16384}, {"name": "Screening", "position": 32768}, {"name": "Interview", "position": 49152}, {"name": "Offer", "position": 65536}, {"name": "Hired", "position": 81920}]}`)),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New(),
			Name:        "Sales Funnel",
			Description: "Leads, Qualified, Proposal, Negotiation, Won",
			Category:    "Sales",
			Data:        datatypes.JSON([]byte(`{"columns": [{"name": "Leads", "position": 16384}, {"name": "Qualified", "position": 32768}, {"name": "Proposal", "position": 49152}, {"name": "Negotiation", "position": 65536}, {"name": "Won", "position": 81920}]}`)),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New(),
			Name:        "Support Queue",
			Description: "New, Investigating, Waiting on Customer, Resolved",
			Category:    "Customer Support",
			Data:        datatypes.JSON([]byte(`{"columns": [{"name": "New", "position": 16384}, {"name": "Investigating", "position": 32768}, {"name": "Waiting on Customer", "position": 49152}, {"name": "Resolved", "position": 65536}]}`)),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	log.Println("Seeding board templates...")

	for _, template := range templates {
		var existing models.BoardTemplate
		err := db.Where("name = ? AND category = ?", template.Name, template.Category).First(&existing).Error
		if err == nil {
			if updateErr := db.Model(&existing).Updates(map[string]interface{}{
				"description": template.Description,
				"data":        template.Data,
				"updated_at":  time.Now(),
			}).Error; updateErr != nil {
				log.Printf("Error updating template %s: %v", template.Name, updateErr)
			}
			continue
		}
		if err != gorm.ErrRecordNotFound {
			log.Printf("Error checking template %s: %v", template.Name, err)
			continue
		}
		if err := db.Create(&template).Error; err != nil {
			log.Printf("Error seeding template %s: %v", template.Name, err)
		}
	}
}
