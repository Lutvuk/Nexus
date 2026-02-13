package handlers

import (
	"crypto/rand"
	"fmt"
	"net/http"
	"nexus-backend/internal/services"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"nexus-backend/internal/models"
	"nexus-backend/pkg/auth"
	"nexus-backend/pkg/utils"

	"gorm.io/gorm"
)

type AuthHandler struct {
	DB           *gorm.DB
	EmailService services.EmailService
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type VerifyEmailRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required"`
}

const (
	maxFailedAttempts = 5
	lockoutDuration   = 15 * time.Minute
	attemptTTL        = 24 * time.Hour
)

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func loginKey(ip, email string) string {
	return ip + "|" + email
}

func (h *AuthHandler) getLockRemaining(key string) (time.Duration, bool) {
	now := time.Now()
	cutoff := now.Add(-attemptTTL)

	// Keep table lean by pruning expired and stale records.
	h.DB.Where("updated_at < ? AND (locked_until IS NULL OR locked_until <= ?)", cutoff, now).
		Delete(&models.LoginAttempt{})

	var attempt models.LoginAttempt
	if err := h.DB.First(&attempt, "key = ?", key).Error; err == nil && attempt.LockedUntil != nil && attempt.LockedUntil.After(now) {
		return time.Until(*attempt.LockedUntil), true
	}
	return 0, false
}

func (h *AuthHandler) registerFailedAttempt(key, ip, email string) {
	now := time.Now()
	var attempt models.LoginAttempt

	if err := h.DB.First(&attempt, "key = ?", key).Error; err != nil {
		attempt = models.LoginAttempt{
			Key:      key,
			IP:       ip,
			Email:    email,
			Failures: 1,
		}
		if attempt.Failures >= maxFailedAttempts {
			lockUntil := now.Add(lockoutDuration)
			attempt.LockedUntil = &lockUntil
			attempt.Failures = 0
		}
		_ = h.DB.Create(&attempt).Error
		return
	}

	attempt.IP = ip
	attempt.Email = email
	attempt.Failures++
	if attempt.Failures >= maxFailedAttempts {
		lockUntil := now.Add(lockoutDuration)
		attempt.LockedUntil = &lockUntil
		attempt.Failures = 0
	} else {
		attempt.LockedUntil = nil
	}
	_ = h.DB.Save(&attempt).Error
}

func (h *AuthHandler) clearAttempts(key string) {
	h.DB.Where("key = ?", key).Delete(&models.LoginAttempt{})
}

func validatePasswordPolicy(password string) bool {
	if len(password) < 8 {
		return false
	}
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, r := range password {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		default:
			hasSpecial = true
		}
	}
	return hasUpper && hasLower && hasDigit && hasSpecial
}

func generateVerificationCode() string {
	// 6-digit numeric code
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "000000"
	}
	n := int(b[0])<<16 | int(b[1])<<8 | int(b[2])
	return fmt.Sprintf("%06d", n%1000000)
}

func sanitizeUsernameBase(input string) string {
	input = strings.ToLower(strings.TrimSpace(input))
	var b strings.Builder
	for _, r := range input {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_' || r == '.' {
			b.WriteRune(r)
		}
	}
	base := strings.Trim(b.String(), "._")
	if len(base) < 3 {
		return "user"
	}
	return base
}

func (h *AuthHandler) generateUniqueUsername(email, name string) string {
	local := strings.TrimSpace(strings.SplitN(email, "@", 2)[0])
	base := sanitizeUsernameBase(local)
	if base == "user" && strings.TrimSpace(name) != "" {
		base = sanitizeUsernameBase(strings.ReplaceAll(name, " ", "_"))
	}

	candidate := base
	for i := 1; i <= 9999; i++ {
		var existing models.User
		if err := h.DB.Select("id").Where("username = ?", candidate).First(&existing).Error; err != nil {
			return candidate
		}
		candidate = base + strconv.Itoa(i)
	}
	return base + strconv.Itoa(int(time.Now().Unix()%100000))
}

func (h *AuthHandler) resolveEmailVerified(userID uuid.UUID, email string) bool {
	var verification models.EmailVerification
	if err := h.DB.Where("user_id = ? AND email = ?", userID, email).First(&verification).Error; err != nil {
		// Legacy users without verification records are treated as verified.
		return true
	}
	return verification.VerifiedAt != nil
}

// Simple Helper for Password Hashing (Should be in utility pkg)
func hashPassword(password string) (string, error) {
	// Determine salt/params - simplified for MVP using fixed or generated salt
	// Ideally use a library like "golang.org/x/crypto/bcrypt" for easier usage
	// But since report mentioned Argon2:

	// For simplicity in this step, let's use bcrypt as it's standard and easier to implement correctly
	// strictly conforming to "Argon2" requirement might need more boilerplate.
	// If strict Argon2 is needed, I can implement it.
	// Let's stick to the prompt requirement if possible or use best practice.
	// I'll use a placeholder or basic bcrypt if dependency allows.
	// Re-checking imports... I see I didn't add bcrypt to go.mod yet.
	// I will use a simple mock hash for now or try to use argon2 if I can implement it quickly.

	// Let's use a simulated hash for the immediate compile,
	// BUT I SHOULD ADD golang.org/x/crypto/bcrypt to go.mod in next step.
	return "hashed_" + password, nil
}

// REAL IMPLEMENTATION requires `go get golang.org/x/crypto/bcrypt`
// I will add that command to the queue.

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.Email = normalizeEmail(req.Email)
	req.Name = strings.TrimSpace(req.Name)

	if len(req.Name) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name must be at least 2 characters"})
		return
	}
	if !validatePasswordPolicy(req.Password) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 chars and include uppercase, lowercase, number, and symbol"})
		return
	}

	// Check existing
	var existing models.User
	if result := h.DB.Where("email = ?", req.Email).First(&existing); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}

	// Hash Password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	verificationCode := generateVerificationCode()
	verificationUntil := time.Now().Add(15 * time.Minute)

	userID := uuid.New()
	user := models.User{
		ID:       userID,
		Email:    req.Email,
		Password: hashedPassword,
		Name:     req.Name,
		Username: h.generateUniqueUsername(req.Email, req.Name),
	}

	// Transaction for atomic creation
	tx := h.DB.Begin()

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Create Default Workspace
	workspaceID := uuid.New()
	workspace := models.Workspace{
		ID:      workspaceID,
		Name:    req.Name + "'s Workspace",
		OwnerID: userID,
	}
	if err := tx.Create(&workspace).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workspace"})
		return
	}

	// Create Default Board
	boardID := uuid.New()
	board := models.Board{
		ID:          boardID,
		WorkspaceID: workspaceID,
		Title:       "Welcome Board",
	}
	if err := tx.Create(&board).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create board"})
		return
	}

	// Create Default Columns
	columns := []models.Column{
		{BoardID: boardID, Name: "To Do", Position: 1000},
		{BoardID: boardID, Name: "In Progress", Position: 2000},
		{BoardID: boardID, Name: "Done", Position: 3000},
	}
	if err := tx.Create(&columns).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create columns"})
		return
	}

	verification := models.EmailVerification{
		ID:        uuid.New(),
		UserID:    userID,
		Email:     req.Email,
		Code:      verificationCode,
		ExpiresAt: verificationUntil,
	}
	if err := tx.Create(&verification).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create email verification"})
		return
	}

	tx.Commit()

	if h.EmailService != nil {
		subject := "Verify your Nexus account"
		body := fmt.Sprintf("Your Nexus verification code is %s. It expires in 15 minutes.", verificationCode)
		_ = h.EmailService.SendNotificationEmail(user.Email, subject, body)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Account created. Please verify your email using the 6-digit code sent to your inbox.",
		"email":   user.Email,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.Email = normalizeEmail(req.Email)

	ip := c.ClientIP()
	key := loginKey(ip, req.Email)
	if remaining, locked := h.getLockRemaining(key); locked {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":                "Too many failed login attempts. Please try again later.",
			"retry_after_seconds":  int(remaining.Seconds()),
			"max_failed_attempts":  maxFailedAttempts,
			"lockout_duration_min": int(lockoutDuration.Minutes()),
		})
		return
	}

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		h.registerFailedAttempt(key, ip, req.Email)
		time.Sleep(250 * time.Millisecond)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Verify password hash
	if !utils.CheckPasswordHash(req.Password, user.Password) {
		h.registerFailedAttempt(key, ip, req.Email)
		time.Sleep(250 * time.Millisecond)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	h.clearAttempts(key)

	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	user.EmailVerified = h.resolveEmailVerified(user.ID, user.Email)
	c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
}

func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	req.Email = normalizeEmail(req.Email)
	req.Code = strings.TrimSpace(req.Code)

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}

	var verification models.EmailVerification
	if err := h.DB.Where("user_id = ? AND email = ?", user.ID, req.Email).First(&verification).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active verification request. Please resend code."})
		return
	}
	if verification.VerifiedAt != nil {
		c.JSON(http.StatusOK, gin.H{"message": "Email is already verified"})
		return
	}
	if verification.ExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Verification code expired. Please request a new code."})
		return
	}
	if verification.Code == "" || verification.Code != req.Code {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification code"})
		return
	}

	now := time.Now()
	if err := h.DB.Model(&models.EmailVerification{}).Where("id = ?", verification.ID).Updates(map[string]interface{}{
		"verified_at": now,
		"code":        "",
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify email"})
		return
	}

	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	user.EmailVerified = true
	c.JSON(http.StatusOK, gin.H{"message": "Email verified", "token": token, "user": user})
}

func (h *AuthHandler) ResendVerification(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	email := normalizeEmail(req.Email)
	var user models.User
	if err := h.DB.Where("email = ?", email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}

	code := generateVerificationCode()
	until := time.Now().Add(15 * time.Minute)
	var verification models.EmailVerification
	result := h.DB.Where("user_id = ? AND email = ?", user.ID, email).First(&verification)
	if result.Error == nil {
		if verification.VerifiedAt != nil {
			c.JSON(http.StatusOK, gin.H{"message": "Email is already verified"})
			return
		}
		if err := h.DB.Model(&models.EmailVerification{}).Where("id = ?", verification.ID).Updates(map[string]interface{}{
			"code":       code,
			"expires_at": until,
		}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create verification code"})
			return
		}
	} else {
		verification = models.EmailVerification{
			ID:        uuid.New(),
			UserID:    user.ID,
			Email:     email,
			Code:      code,
			ExpiresAt: until,
		}
		if err := h.DB.Create(&verification).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create verification code"})
			return
		}
	}

	if h.EmailService != nil {
		subject := "Your Nexus verification code"
		body := fmt.Sprintf("Your Nexus verification code is %s. It expires in 15 minutes.", code)
		_ = h.EmailService.SendNotificationEmail(user.Email, subject, body)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification code sent"})
}

func (h *AuthHandler) SearchUsers(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query required"})
		return
	}

	var users []models.User
	// Basic search (LIMIT 10)
	if err := h.DB.Where("email LIKE ? OR name LIKE ?", "%"+query+"%", "%"+query+"%").Limit(10).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	c.JSON(http.StatusOK, users)
}
