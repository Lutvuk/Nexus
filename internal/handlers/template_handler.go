package handlers

import (
	"net/http"
	"nexus-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TemplateHandler struct {
	DB *gorm.DB
}

func NewTemplateHandler(db *gorm.DB) *TemplateHandler {
	return &TemplateHandler{DB: db}
}

func (h *TemplateHandler) GetBoardTemplates(c *gin.Context) {
	var templates []models.BoardTemplate
	if err := h.DB.Order("category, name").Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch templates"})
		return
	}
	c.JSON(http.StatusOK, templates)
}
