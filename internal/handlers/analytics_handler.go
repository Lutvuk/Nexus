package handlers

import (
	"log"
	"net/http"
	"time"

	"nexus-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AnalyticsHandler struct {
	DB *gorm.DB
}

func NewAnalyticsHandler(db *gorm.DB) *AnalyticsHandler {
	return &AnalyticsHandler{DB: db}
}

type BoardAnalytics struct {
	TotalCards     int64          `json:"total_cards"`
	CompletedCards int64          `json:"completed_cards"`
	CardsPerList   []StatItem     `json:"cards_per_list"`
	CardsPerLabel  []StatItem     `json:"cards_per_label"`
	CardsPerMember []StatItem     `json:"cards_per_member"`
	DueDateStatus  DueDateStats   `json:"due_date_status"`
	WeeklyActivity []ActivityStat `json:"weekly_activity"`
}

type StatItem struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
	Color string `json:"color,omitempty"`
}

type DueDateStats struct {
	Overdue int64 `json:"overdue"`
	DueSoon int64 `json:"due_soon"`
	NoDate  int64 `json:"no_date"`
	Future  int64 `json:"future"`
}

type ActivityStat struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

func (h *AnalyticsHandler) GetBoardAnalytics(c *gin.Context) {
	boardIDStr := c.Param("id")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var analytics BoardAnalytics
	var cards []models.Card

	// 1. Fetch Column IDs for this board
	var columnIDs []uuid.UUID
	if err := h.DB.Model(&models.Column{}).Where("board_id = ?", boardID).Pluck("id", &columnIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch columns"})
		return
	}
	log.Printf("[Analytics] BoardID: %v, Found ColumnIDs: %v", boardID, columnIDs)

	if len(columnIDs) > 0 {
		// Convert to strings for GORM IN clause safety
		colIDStrings := make([]string, len(columnIDs))
		for i, id := range columnIDs {
			colIDStrings[i] = id.String()
		}

		// 2. Fetch Cards
		err = h.DB.Preload("Labels").
			Preload("Members").
			Where("column_id IN ?", colIDStrings).
			Find(&cards).Error
		log.Printf("[Analytics] Found %d cards", len(cards))

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch data"})
			return
		}
	} else {
		cards = []models.Card{}
	}

	analytics.TotalCards = int64(len(cards))
	now := time.Now()

	for _, card := range cards {
		if card.IsComplete {
			analytics.CompletedCards++
		}
	}

	// Re-approach: Use SQL Group By for efficiency

	// Cards per List
	var listStats []StatItem
	h.DB.Table("cards").
		Select("columns.name as name, count(*) as count").
		Joins("join columns on columns.id = cards.column_id").
		Where("columns.board_id = ?", boardID).
		Group("columns.name").
		Scan(&listStats)
	analytics.CardsPerList = listStats

	// Cards per Label (Many-to-Many is tricky with simple Ref types, but let's try)
	// This might be easier to do in application code if dataset is small, or raw SQL.
	// Raw SQL for robustness:
	var labelStats []StatItem
	h.DB.Raw(`
		SELECT l.name, l.color, count(cl.card_id) as count
		FROM labels l
		JOIN card_labels cl ON l.id = cl.label_id
		JOIN cards c ON cl.card_id = c.id
		JOIN columns col ON c.column_id = col.id
		WHERE col.board_id = ?
		GROUP BY l.name, l.color
	`, boardID).Scan(&labelStats)
	analytics.CardsPerLabel = labelStats

	// Cards per Member
	var memberStats []StatItem
	h.DB.Raw(`
		SELECT u.name, count(cm.user_id) as count
		FROM users u
		JOIN card_members cm ON u.id = cm.user_id
		JOIN cards c ON cm.card_id = c.id
		JOIN columns col ON c.column_id = col.id
		WHERE col.board_id = ?
		GROUP BY u.name
	`, boardID).Scan(&memberStats)
	analytics.CardsPerMember = memberStats

	// Validating Due Dates logic in application code (easier than complex SQL Case statements)
	for _, card := range cards {
		if card.DueDate == nil {
			analytics.DueDateStatus.NoDate++
		} else {
			if card.DueDate.Before(now) && !card.IsComplete {
				analytics.DueDateStatus.Overdue++
			} else if card.DueDate.Before(now.AddDate(0, 0, 7)) && !card.IsComplete {
				analytics.DueDateStatus.DueSoon++
			} else {
				analytics.DueDateStatus.Future++
			}
		}
	}

	// Last 7 days activity
	// We need to query Activity table
	var activityStats []ActivityStat
	sevenDaysAgo := now.AddDate(0, 0, -7)
	h.DB.Table("activities").
		Select("to_char(created_at, 'YYYY-MM-DD') as date, count(*) as count").
		Where("board_id = ? AND created_at >= ?", boardID, sevenDaysAgo).
		Group("to_char(created_at, 'YYYY-MM-DD')").
		Order("date").
		Scan(&activityStats)
	analytics.WeeklyActivity = activityStats

	c.JSON(http.StatusOK, analytics)
}
