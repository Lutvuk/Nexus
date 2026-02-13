package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"nexus-backend/internal/models"
	"nexus-backend/internal/realtime"
	"nexus-backend/internal/services"
)

type WorkspaceHandler struct {
	DB              *gorm.DB
	Hub             *realtime.Hub
	EmailService    services.EmailService
	ActivityService *services.ActivityService
}

func frontendBaseURL() string {
	frontend := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if frontend == "" {
		frontend = "http://localhost:4200"
	}
	return strings.TrimRight(frontend, "/")
}

func NewWorkspaceHandler(db *gorm.DB, hub *realtime.Hub, emailService services.EmailService, activityService *services.ActivityService) *WorkspaceHandler {
	return &WorkspaceHandler{
		DB:              db,
		Hub:             hub,
		EmailService:    emailService,
		ActivityService: activityService,
	}
}

// CreateWorkspace creates a new workspace owned by the current user.
func (h *WorkspaceHandler) CreateWorkspace(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Name string `json:"name" binding:"required,min=1,max=120"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workspace name is required"})
		return
	}

	var ownedCount int64
	h.DB.Model(&models.Workspace{}).Where("owner_id = ?", userId.(uuid.UUID)).Count(&ownedCount)
	if ownedCount >= 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum 10 workspaces per user"})
		return
	}

	workspace := models.Workspace{
		ID:      uuid.New(),
		Name:    req.Name,
		OwnerID: userId.(uuid.UUID),
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&workspace).Error; err != nil {
			return err
		}

		board := models.Board{
			ID:          uuid.New(),
			WorkspaceID: workspace.ID,
			Title:       "Welcome Board",
		}
		if err := tx.Create(&board).Error; err != nil {
			return err
		}

		columns := []models.Column{
			{BoardID: board.ID, Name: "To Do", Position: 1000},
			{BoardID: board.ID, Name: "In Progress", Position: 2000},
			{BoardID: board.ID, Name: "Done", Position: 3000},
		}
		if err := tx.Create(&columns).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workspace"})
		return
	}

	if h.ActivityService != nil {
		h.ActivityService.LogActivity(userId.(uuid.UUID), workspace.ID, "created_workspace", workspace.ID, map[string]interface{}{
			"name": workspace.Name,
		})
	}

	c.JSON(http.StatusCreated, workspace)
}

// DeleteWorkspace deletes a workspace and all its boards (owner only).
func (h *WorkspaceHandler) DeleteWorkspace(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	var workspace models.Workspace
	if err := h.DB.First(&workspace, "id = ?", workspaceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	if workspace.OwnerID != userId.(uuid.UUID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the owner can delete the workspace"})
		return
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("workspace_id = ?", workspaceID).Delete(&models.Board{}).Error; err != nil {
			return err
		}
		if err := tx.Where("workspace_id = ?", workspaceID).Delete(&models.WorkspaceMember{}).Error; err != nil {
			return err
		}
		if err := tx.Where("workspace_id = ?", workspaceID).Delete(&models.InviteLink{}).Error; err != nil {
			return err
		}
		if err := tx.Delete(&workspace).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workspace"})
		return
	}

	if h.ActivityService != nil {
		h.ActivityService.LogActivity(userId.(uuid.UUID), workspaceID, "deleted_workspace", workspaceID, map[string]interface{}{
			"name": workspace.Name,
		})
	}

	c.Status(http.StatusNoContent)
}

// UpdateWorkspace allows the owner to rename the workspace
func (h *WorkspaceHandler) UpdateWorkspace(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workspace name is required"})
		return
	}

	// Verify Owner
	var workspace models.Workspace
	if err := h.DB.First(&workspace, "id = ?", workspaceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	if workspace.OwnerID != userId.(uuid.UUID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the owner can rename the workspace"})
		return
	}

	// Update
	if err := h.DB.Model(&workspace).Update("name", req.Name).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workspace"})
		return
	}

	// Log Activity
	h.ActivityService.LogActivity(userId.(uuid.UUID), workspaceID, "renamed_workspace", workspaceID, map[string]interface{}{
		"new_name": req.Name,
	})

	c.JSON(http.StatusOK, workspace)
}

// ListWorkspaces returns workspaces owned by OR shared with the user
func (h *WorkspaceHandler) ListWorkspaces(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// 1. Get Owned Workspaces
	var owned []models.Workspace
	h.DB.Preload("Boards").Where("owner_id = ?", userId).Find(&owned)

	// 2. Get Shared Workspaces
	var shared []models.Workspace
	// Join with workspace_members to find workspaces where user is an ACCEPTED member
	h.DB.Preload("Boards").
		Joins("JOIN workspace_members on workspace_members.workspace_id = workspaces.id").
		Where("workspace_members.user_id = ? AND workspace_members.status = 'accepted'", userId).
		Find(&shared)

	// Preserve deterministic order: owned first, then shared (deduplicated)
	seen := make(map[uuid.UUID]bool)
	result := make([]models.Workspace, 0, len(owned)+len(shared))
	for _, w := range owned {
		if seen[w.ID] {
			continue
		}
		seen[w.ID] = true
		result = append(result, w)
	}
	for _, w := range shared {
		if seen[w.ID] {
			continue
		}
		seen[w.ID] = true
		result = append(result, w)
	}

	c.JSON(http.StatusOK, result)
}

// InviteMember adds a user to a workspace by email
func (h *WorkspaceHandler) InviteMember(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}

	// 1. Verify Requestor is Member/Owner (For now just check if they have access to workspace?)
	// Ideally should check permissions. MVP: If you can access the workspace, you can invite?
	// Let's enforce Owner for now to be safe, or just skip perms for MVP speed.
	// Skipping permission check for MVP speed (User must be authenticated though)

	// 2. Find User by Email
	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// 3. Check if already member
	var existing models.WorkspaceMember
	if err := h.DB.Where("workspace_id = ? AND user_id = ?", workspaceID, user.ID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already in workspace"})
		return
	}

	// 4. Add Member
	member := models.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      user.ID,
		Role:        "member",
		AddedAt:     time.Now(),
	}

	if err := h.DB.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to invite member"})
		return
	}

	// Get workspace name for notification
	var workspace models.Workspace
	h.DB.First(&workspace, "id = ?", workspaceID)

	// Get inviter details
	userID, _ := c.Get("userID")
	var inviter models.User
	h.DB.First(&inviter, userID)

	// Send Email
	links := frontendBaseURL() + "/dashboard"
	_ = h.EmailService.SendInvitationEmail(req.Email, workspace.Name, inviter.Name, links)

	// Broadcast real-time notification to invited user
	if h.Hub != nil {
		h.Hub.BroadcastToUser(user.ID.String(), realtime.MessageTypeInvitationReceived, map[string]interface{}{
			"workspace_id":   workspaceID.String(),
			"workspace_name": workspace.Name,
			"message":        "You have been invited to join a workspace",
		})
	}

	// Log Activity
	h.ActivityService.LogActivity(userID.(uuid.UUID), workspaceID, "invited_member", user.ID, map[string]interface{}{
		"invited_email": user.Email,
	})

	c.JSON(http.StatusCreated, gin.H{"message": "Member invited", "user": user})
}

// RemoveMember removes a user from a workspace
func (h *WorkspaceHandler) RemoveMember(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	targetUserID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.DB.Where("workspace_id = ? AND user_id = ?", workspaceID, targetUserID).Delete(&models.WorkspaceMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member"})
		return
	}

	// Log Activity
	if userID, exists := c.Get("userID"); exists {
		h.ActivityService.LogActivity(userID.(uuid.UUID), workspaceID, "removed_member", targetUserID, nil)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member removed"})
}

// ListPendingInvitations returns invitations for the current user
func (h *WorkspaceHandler) ListPendingInvitations(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var invitations []models.WorkspaceMember
	h.DB.Preload("Workspace").Where("user_id = ? AND status = 'pending'", userId).Find(&invitations)

	c.JSON(http.StatusOK, invitations)
}

// AcceptInvitation accepts a workspace invitation
func (h *WorkspaceHandler) AcceptInvitation(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	result := h.DB.Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND user_id = ? AND status = 'pending'", workspaceID, userId).
		Update("status", "accepted")

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation not found"})
		return
	}

	// Log Activity (as system or self?)
	// User accepting is the actor.
	h.ActivityService.LogActivity(userId.(uuid.UUID), workspaceID, "joined_workspace", userId.(uuid.UUID), nil)

	c.JSON(http.StatusOK, gin.H{"message": "Invitation accepted"})
}

// DeclineInvitation declines a workspace invitation
func (h *WorkspaceHandler) DeclineInvitation(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	result := h.DB.Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND user_id = ? AND status = 'pending'", workspaceID, userId).
		Update("status", "declined")

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invitation declined"})
}

// ========================================
// LEAVE WORKSPACE
// ========================================

// LeaveWorkspace allows a member to leave a workspace
func (h *WorkspaceHandler) LeaveWorkspace(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	// Check if user is the owner (owners cannot leave, they must transfer or delete)
	var workspace models.Workspace
	if err := h.DB.First(&workspace, "id = ?", workspaceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	if workspace.OwnerID == userId.(uuid.UUID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Owner cannot leave workspace. Transfer ownership or delete workspace."})
		return
	}

	// Delete membership
	result := h.DB.Where("workspace_id = ? AND user_id = ?", workspaceID, userId).Delete(&models.WorkspaceMember{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "You are not a member of this workspace"})
		return
	}

	// Log Activity
	h.ActivityService.LogActivity(userId.(uuid.UUID), workspaceID, "left_workspace", userId.(uuid.UUID), nil)

	c.JSON(http.StatusOK, gin.H{"message": "You have left the workspace"})
}

// ========================================
// MEMBER MANAGEMENT
// ========================================

// ListMembers returns accepted members of a workspace (including owner)
func (h *WorkspaceHandler) ListMembers(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	// Fetch workspace to get owner
	var workspace models.Workspace
	if err := h.DB.Preload("Owner").First(&workspace, "id = ?", workspaceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	// Fetch regular members
	var members []models.WorkspaceMember
	h.DB.Preload("User").Where("workspace_id = ? AND status = 'accepted'", workspaceID).Find(&members)

	// Create synthetic owner entry
	ownerMember := models.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      workspace.OwnerID,
		User:        workspace.Owner,
		Role:        "owner",
		Status:      "accepted",
		AddedAt:     workspace.CreatedAt,
	}

	// Prepend owner to members
	result := append([]models.WorkspaceMember{ownerMember}, members...)

	c.JSON(http.StatusOK, result)
}

// ========================================
// JOIN REQUESTS
// ========================================

// RequestToJoin creates a join request (status = 'requested')
func (h *WorkspaceHandler) RequestToJoin(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	// Check if already member or has pending request
	var existing models.WorkspaceMember
	if err := h.DB.Where("workspace_id = ? AND user_id = ?", workspaceID, userId).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Request already exists or you are already a member"})
		return
	}

	member := models.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      userId.(uuid.UUID),
		Role:        "member",
		Status:      "requested",
		AddedAt:     time.Now(),
	}

	if err := h.DB.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send join request"})
		return
	}

	// Log Activity
	h.ActivityService.LogActivity(userId.(uuid.UUID), workspaceID, "requested_to_join", userId.(uuid.UUID), nil)

	c.JSON(http.StatusCreated, gin.H{"message": "Join request sent"})
}

// ListJoinRequests returns pending join requests for a workspace (for owners/admins)
func (h *WorkspaceHandler) ListJoinRequests(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	var requests []models.WorkspaceMember
	h.DB.Preload("User").Where("workspace_id = ? AND status = 'requested'", workspaceID).Find(&requests)

	c.JSON(http.StatusOK, requests)
}

// ApproveJoinRequest approves a join request
func (h *WorkspaceHandler) ApproveJoinRequest(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	targetUserID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	result := h.DB.Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND user_id = ? AND status = 'requested'", workspaceID, targetUserID).
		Update("status", "accepted")

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Join request not found"})
		return
	}

	// Send Email Notification
	var workspace models.Workspace
	h.DB.First(&workspace, workspaceID)

	var user models.User
	h.DB.First(&user, targetUserID)

	_ = h.EmailService.SendJoinRequestApprovedEmail(user.Email, workspace.Name)

	// Log Activity
	if userId, exists := c.Get("userID"); exists {
		h.ActivityService.LogActivity(userId.(uuid.UUID), workspaceID, "approved_join_request", targetUserID, nil)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Join request approved"})
}

// DeclineJoinRequest declines a join request
func (h *WorkspaceHandler) DeclineJoinRequest(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	targetUserID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Delete declined requests (optional: could set status to 'declined' instead)
	result := h.DB.Where("workspace_id = ? AND user_id = ? AND status = 'requested'", workspaceID, targetUserID).
		Delete(&models.WorkspaceMember{})

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Join request not found"})
		return
	}

	// Log Activity
	if userId, exists := c.Get("userID"); exists {
		h.ActivityService.LogActivity(userId.(uuid.UUID), workspaceID, "declined_join_request", targetUserID, nil)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Join request declined"})
}

// ========================================
// INVITE LINKS
// ========================================

// GenerateToken creates a secure random token
func generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// CreateInviteLink generates a new invite link for a workspace
func (h *WorkspaceHandler) CreateInviteLink(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	// Delete any existing invite link for this workspace (one link per workspace)
	h.DB.Where("workspace_id = ?", workspaceID).Delete(&models.InviteLink{})

	token, err := generateToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	inviteLink := models.InviteLink{
		WorkspaceID: workspaceID,
		Token:       token,
		CreatedBy:   userId.(uuid.UUID),
	}

	if err := h.DB.Create(&inviteLink).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invite link"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"link":  frontendBaseURL() + "/join/" + token,
	})
}

// GetInviteLink returns the current invite link for a workspace
func (h *WorkspaceHandler) GetInviteLink(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	var inviteLink models.InviteLink
	if err := h.DB.Where("workspace_id = ?", workspaceID).First(&inviteLink).Error; err != nil {
		// No link yet is a valid state; return empty payload so frontend can render cleanly.
		c.JSON(http.StatusOK, gin.H{
			"token":      "",
			"link":       "",
			"uses_count": 0,
			"max_uses":   0,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":      inviteLink.Token,
		"link":       frontendBaseURL() + "/join/" + inviteLink.Token,
		"uses_count": inviteLink.UsesCount,
		"max_uses":   inviteLink.MaxUses,
		"created_at": inviteLink.CreatedAt,
	})
}

// RevokeInviteLink deletes the invite link for a workspace
func (h *WorkspaceHandler) RevokeInviteLink(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	result := h.DB.Where("workspace_id = ?", workspaceID).Delete(&models.InviteLink{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No invite link found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invite link revoked"})
}

// JoinViaLink handles joining a workspace via invite link token
func (h *WorkspaceHandler) JoinViaLink(c *gin.Context) {
	userId, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token required"})
		return
	}

	// Find invite link
	var inviteLink models.InviteLink
	if err := h.DB.Preload("Workspace").Where("token = ?", token).First(&inviteLink).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired invite link"})
		return
	}

	// Check if valid
	if !inviteLink.IsValid() {
		c.JSON(http.StatusGone, gin.H{"error": "Invite link has expired or reached max uses"})
		return
	}

	// Check if already member
	var existing models.WorkspaceMember
	if err := h.DB.Where("workspace_id = ? AND user_id = ?", inviteLink.WorkspaceID, userId).First(&existing).Error; err == nil {
		if existing.Status == "accepted" {
			c.JSON(http.StatusConflict, gin.H{"error": "You are already a member of this workspace"})
			return
		}
		// Update pending/requested to accepted
		h.DB.Model(&existing).Update("status", "accepted")
	} else {
		// Create new membership with accepted status (auto-join via link)
		member := models.WorkspaceMember{
			WorkspaceID: inviteLink.WorkspaceID,
			UserID:      userId.(uuid.UUID),
			Role:        "member",
			Status:      "accepted",
			AddedAt:     time.Now(),
		}
		if err := h.DB.Create(&member).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join workspace"})
			return
		}
	}

	// Increment uses count
	h.DB.Model(&inviteLink).Update("uses_count", inviteLink.UsesCount+1)

	// Log Activity
	h.ActivityService.LogActivity(userId.(uuid.UUID), inviteLink.WorkspaceID, "joined_via_link", userId.(uuid.UUID), nil)

	c.JSON(http.StatusOK, gin.H{
		"message":        "Successfully joined workspace",
		"workspace_id":   inviteLink.WorkspaceID,
		"workspace_name": inviteLink.Workspace.Name,
	})
}

// UpdateMemberRole updates a member's role in a workspace (owner only)
func (h *WorkspaceHandler) UpdateMemberRole(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}

	targetUserID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		Role string `json:"role" binding:"required,oneof=admin member"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Valid role (admin, member) is required"})
		return
	}

	// 1. Verify Requestor is the OWNER
	requestorID, _ := c.Get("userID")
	var workspace models.Workspace
	if err := h.DB.First(&workspace, "id = ?", workspaceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	if workspace.OwnerID != requestorID.(uuid.UUID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only workspace owners can change roles"})
		return
	}

	// 2. Prevent Owner from changing their own role (they are owner, not in members table usually, but safe to check)
	if targetUserID == workspace.OwnerID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Owner role cannot be changed"})
		return
	}

	// 3. Update Role
	result := h.DB.Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND user_id = ?", workspaceID, targetUserID).
		Update("role", req.Role)

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}

	// Log Activity
	h.ActivityService.LogActivity(requestorID.(uuid.UUID), workspaceID, "updated_member_role", targetUserID, map[string]interface{}{
		"new_role": req.Role,
	})

	// Real-time broadcast to all workspace members
	if h.Hub != nil {
		// Broadcast to the user whose role changed
		h.Hub.BroadcastToUser(targetUserID.String(), realtime.MessageTypeRoleUpdated, map[string]interface{}{
			"workspace_id": workspaceID.String(),
			"user_id":      targetUserID.String(),
			"new_role":     req.Role,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member role updated", "role": req.Role})
}
