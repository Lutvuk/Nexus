package config

import (
	"log"
	"os"

	"nexus-backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func ConnectDatabase() *gorm.DB {
	dsn := os.Getenv("POSTGRES_URL")
	if dsn == "" {
		dsn = "host=localhost user=postgres password=nexus dbname=nexus port=5432 sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Enable UUID extension
	db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")

	// Auto Migrate
	err = db.AutoMigrate(&models.Column{}, &models.Card{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database connected and migrated successfully")
	return db
}
