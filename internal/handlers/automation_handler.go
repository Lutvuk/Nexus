package handlers

import (
	"net/http"
	"nexus-backend/internal/models"
	"nexus-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AutomationHandler struct {
	Service *services.AutomationService
}

func NewAutomationHandler(service *services.AutomationService) *AutomationHandler {
	return &AutomationHandler{Service: service}
}

func (h *AutomationHandler) GetRules(c *gin.Context) {
	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	rules, err := h.Service.GetRulesByBoard(boardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch rules"})
		return
	}

	c.JSON(http.StatusOK, rules)
}

func (h *AutomationHandler) CreateRule(c *gin.Context) {
	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var rule models.AutomationRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Override BoardID from URL
	rule.BoardID = boardID
	rule.ID = uuid.New()

	if err := h.Service.CreateRule(&rule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create rule"})
		return
	}

	c.JSON(http.StatusCreated, rule)
}

func (h *AutomationHandler) DeleteRule(c *gin.Context) {
	id, err := uuid.Parse(c.Param("ruleId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid rule ID"})
		return
	}

	if err := h.Service.DeleteRule(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete rule"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rule deleted"})
}

func (h *AutomationHandler) ToggleRule(c *gin.Context) {
	id, err := uuid.Parse(c.Param("ruleId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid rule ID"})
		return
	}

	if err := h.Service.ToggleRule(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle rule"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rule toggled"})
}
