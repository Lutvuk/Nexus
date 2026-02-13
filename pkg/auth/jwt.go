package auth

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// SecretKey is loaded from environment to avoid hardcoded secrets.
// Use JWT_SECRET and rotate in production.
var SecretKey = []byte(getEnvOrPanic("JWT_SECRET"))

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uuid.UUID) (string, error) {
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(SecretKey)
}

func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Enforce expected signing method to avoid algorithm confusion.
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return SecretKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func getEnvOrPanic(key string) string {
	value := os.Getenv(key)
	if value != "" {
		return value
	}

	// Keep strict env requirements in runtime, but allow predictable test defaults.
	if strings.Contains(filepath.Base(os.Args[0]), ".test") {
		return "test-secret"
	}

	panic("missing required env var: " + key)
}
