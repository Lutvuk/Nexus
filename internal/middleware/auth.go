package middleware

import (
	"errors"
	"strings"

	"nexus-backend/pkg/auth"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const UserIDKey = "userID"

// AuthMiddleware validates the JWT token and extracts the userID
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Authorization header required"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.AbortWithStatusJSON(401, gin.H{"error": "Bearer token required"})
			return
		}

		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid or expired token"})
			return
		}

		c.Set(UserIDKey, claims.UserID)
		c.Next()
	}
}

// GetUserID retrieves the userID from the context
func GetUserID(c *gin.Context) (uuid.UUID, error) {
	val, exists := c.Get(UserIDKey)
	if !exists {
		return uuid.Nil, errors.New("user ID not found in context")
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		return uuid.Nil, errors.New("invalid user ID type in context")
	}
	return userID, nil
}
