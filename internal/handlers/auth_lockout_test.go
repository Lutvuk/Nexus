package handlers

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"nexus-backend/internal/models"
)

func setupAuthLockoutTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(&models.LoginAttempt{}); err != nil {
		t.Fatalf("failed to migrate login_attempts: %v", err)
	}
	return db
}

func TestLoginAttemptLockoutPersistsAcrossHandlerInstances(t *testing.T) {
	db := setupAuthLockoutTestDB(t)
	h1 := &AuthHandler{DB: db}

	ip := "127.0.0.1"
	email := "user@example.com"
	key := loginKey(ip, email)

	for i := 0; i < maxFailedAttempts-1; i++ {
		h1.registerFailedAttempt(key, ip, email)
		if _, locked := h1.getLockRemaining(key); locked {
			t.Fatalf("account should not be locked before threshold (attempt %d)", i+1)
		}
	}

	h1.registerFailedAttempt(key, ip, email)
	remaining, locked := h1.getLockRemaining(key)
	if !locked {
		t.Fatal("expected account to be locked after threshold attempts")
	}
	if remaining <= 0 {
		t.Fatalf("expected positive remaining lockout duration, got %v", remaining)
	}
	if remaining > lockoutDuration+time.Second {
		t.Fatalf("remaining lockout duration is unexpectedly large: %v", remaining)
	}

	// Simulate process restart by creating a new handler with same DB.
	h2 := &AuthHandler{DB: db}
	if _, lockedAfterRestart := h2.getLockRemaining(key); !lockedAfterRestart {
		t.Fatal("expected lockout to persist in DB across handler instances")
	}

	h2.clearAttempts(key)
	if _, stillLocked := h2.getLockRemaining(key); stillLocked {
		t.Fatal("expected lockout state to be cleared after successful login cleanup")
	}
}
