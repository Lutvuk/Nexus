package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorResponse represents a standard error format
type ErrorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code,omitempty"`
	Field string `json:"field,omitempty"`
}

func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check if there are any errors attached to the context
		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			log.Printf("Error: %v", err)

			// Simple error handling for now, can be expanded based on error types
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error: "Internal Server Error",
				Code:  "SERVER_ERROR",
			})
		}
	}
}
