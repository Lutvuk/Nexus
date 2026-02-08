package handlers

import (
	"net/http"
	"nexus-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Workspace struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Timestamp   string `json:"timestamp"`
}

type BoardResponse struct {
	Workspace Workspace       `json:"workspace"`
	Columns   []models.Column `json:"columns"`
}

func GetBoard(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var columns []models.Column

		// Fetch columns with nested cards, ordered by position
		// Preload Cards with order
		if err := db.Preload("Cards", func(db *gorm.DB) *gorm.DB {
			return db.Order("cards.position ASC")
		}).Order("position ASC").Find(&columns).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch board"})
			return
		}

		// Calculate CardCount and ensure Cards is empty array not null
		for i := range columns {
			columns[i].CardCount = len(columns[i].Cards)
			if columns[i].Cards == nil {
				columns[i].Cards = []models.Card{}
			}
		}

		response := BoardResponse{
			Workspace: Workspace{
				Name:        "Nexus Workspace",
				Description: "Premium Kanban experience",
				Timestamp:   time.Now().Format(time.RFC3339),
			},
			Columns: columns,
		}

		c.JSON(http.StatusOK, response)
	}
}
