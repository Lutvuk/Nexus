package handlers

import (
	"net/http"
	"nexus-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CreateColumnRequest struct {
	Name string `json:"name" binding:"required,min=1,max=100"`
}

type UpdateColumnRequest struct {
	Name string `json:"name" binding:"max=100"`
}

func CreateColumn(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateColumnRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Name required (1-100 characters)",
				"code":  "VALIDATION_ERROR",
				"field": "name",
			})
			return
		}

		// Find max position
		var maxPos int
		var count int64
		db.Model(&models.Column{}).Count(&count)
		if count > 0 {
			var result struct{ Max int }
			db.Model(&models.Column{}).Select("MAX(position) as max").Scan(&result)
			maxPos = result.Max + 1
		} else {
			maxPos = 0
		}

		column := models.Column{
			Name:     req.Name,
			Position: maxPos,
		}

		if err := db.Create(&column).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create column"})
			return
		}

		c.JSON(http.StatusCreated, column)
	}
}

func UpdateColumn(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req UpdateColumnRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid input",
				"code":  "VALIDATION_ERROR",
			})
			return
		}

		var column models.Column
		if err := db.First(&column, "id = ?", id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Column not found",
				"code":  "NOT_FOUND",
			})
			return
		}

		if req.Name != "" {
			column.Name = req.Name
		}

		if err := db.Save(&column).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update column"})
			return
		}

		c.JSON(http.StatusOK, column)
	}
}

func DeleteColumn(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		result := db.Delete(&models.Column{}, "id = ?", id)
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete column"})
			return
		}

		if result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Column not found",
				"code":  "NOT_FOUND",
			})
			return
		}

		c.Status(http.StatusNoContent)
	}
}
