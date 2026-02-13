package main

import (
	"database/sql"
	"log"
	"os"
	"time"

	"nexus-backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dsn := os.Getenv("POSTGRES_URL")
	if dsn == "" {
		dsn = "host=127.0.0.1 user=postgres password=nexus dbname=nexus port=5432 sslmode=disable"
	}

	// Test pure sql
	log.Println("Testing pure sql with pgx/v5/stdlib...")
	sqlDB, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("Failed to open sql db: %v", err)
	}
	defer sqlDB.Close()

	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("Failed to ping sql db: %v", err)
	}
	log.Println("Ping success")

	var email string
	// Try a simple query
	if err := sqlDB.QueryRow("SELECT email FROM users LIMIT 1").Scan(&email); err != nil {
		if err == sql.ErrNoRows {
			log.Println("Query success (no rows)")
		} else {
			log.Printf("Query failed: %v", err)
		}
	} else {
		log.Println("Query success")
	}

	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:                                   newLogger,
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Connected to database")

	// Test raw query via GORM
	log.Println("Testing raw query via GORM...")
	var u models.User
	if err := db.Raw("SELECT * FROM users LIMIT 1").Scan(&u).Error; err != nil {
		log.Printf("Raw query failed: %v", err)
	} else {
		log.Println("Raw query success")
	}

	// Drop tables in order
	log.Println("Dropping all tables...")
	db.Exec("DROP TABLE IF EXISTS card_members")
	db.Exec("DROP TABLE IF EXISTS card_labels")
	db.Migrator().DropTable(&models.Activity{}, &models.Comment{}, &models.ChecklistItem{}, &models.Checklist{}, &models.Card{}, &models.Column{}, &models.Board{}, &models.InviteLink{}, &models.WorkspaceMember{}, &models.Workspace{}, &models.Label{}, &models.User{})

	// Auto Migrate User
	log.Println("Migrating User...")
	if err := db.AutoMigrate(&models.User{}); err != nil {
		log.Fatal("Failed to migrate User:", err)
	}
	log.Println("User migrated")

	// Auto Migrate Activity
	log.Println("Migrating Activity...")
	if err := db.AutoMigrate(&models.Activity{}); err != nil {
		log.Fatal("Failed to migrate Activity:", err)
	}
	log.Println("Activity migrated")
}
