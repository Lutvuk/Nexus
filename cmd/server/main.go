package main

import (
	"log"
	"nexus-backend/internal/handlers"
	"nexus-backend/internal/middleware"
	"nexus-backend/internal/repository"
	"nexus-backend/internal/services"
	"nexus-backend/pkg/config"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize Database
	db := config.ConnectDatabase()

	// Seed Data
	repository.SeedData(db)

	// Initialize Router
	r := gin.Default()

	// Middleware
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.ErrorHandler())

	// Health Check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK"})
	})

	// API v1 Routes
	v1 := r.Group("/api/v1")
	{
		// Board
		v1.GET("/board", handlers.GetBoard(db))

		// Columns
		v1.POST("/columns", handlers.CreateColumn(db))
		v1.PATCH("/columns/:id", handlers.UpdateColumn(db))
		v1.DELETE("/columns/:id", handlers.DeleteColumn(db))

		// Cards (Day 2)
		cardRepo := repository.NewCardRepository(db)
		cardService := services.NewCardService(cardRepo)
		cardHandler := handlers.NewCardHandler(cardService)

		v1.POST("/columns/:id/cards", cardHandler.Create)
		v1.PATCH("/cards/:id", cardHandler.Update)
		v1.DELETE("/cards/:id", cardHandler.Delete)
		v1.PATCH("/cards/:id/move", cardHandler.Move)
	}

	// Run Server
	log.Println("Server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
