package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"nexus-backend/internal/handlers"
	"nexus-backend/internal/middleware"
	"nexus-backend/internal/models"
	"nexus-backend/internal/realtime"
	"nexus-backend/internal/repository"
	"nexus-backend/internal/services"
	"nexus-backend/pkg/config"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize Database
	db := config.ConnectDatabase()

	// Auto Migrate
	if err := db.AutoMigrate(
		&models.User{},
		&models.Workspace{},
		&models.Board{},
		&models.Column{},
		&models.Card{},
		&models.Checklist{},
		&models.ChecklistItem{},
		&models.Label{},
		&models.WorkspaceMember{},
		&models.InviteLink{},
		&models.Activity{},
		&models.Comment{},
		&models.Attachment{},
		&models.Notification{},
		&models.Subscription{},
		&models.AutomationRule{},
		&models.BoardTemplate{},
		&models.CustomField{},
		&models.CardCustomFieldValue{},
		&models.UserPreferences{},
		&models.LoginAttempt{},
		&models.EmailVerification{},
	); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Seed Data (Modified to check if ANY user exists)
	// For v2, we might want to skip auto-seed or seed a default user
	repository.SeedData(db)

	// Initialize Router
	r := gin.Default()

	// CORS Setup
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.SecurityMiddleware())         // Add Security Headers
	r.Use(middleware.RateLimitMiddleware(50, 100)) // Add Rate Limiting (50 RPS, Burst 100)
	r.Use(middleware.ErrorHandler())               // Keep ErrorHandler

	// Email + Notification Services
	emailService := services.NewEmailServiceFromEnv()

	// --- Real-Time ---
	hub := realtime.NewHub()
	go hub.Run()

	// --- Handlers ---
	authHandler := handlers.AuthHandler{DB: db, EmailService: emailService}
	boardRepo := repository.NewBoardRepository(db)
	boardHandler := handlers.NewBoardHandler(boardRepo, db, hub)

	// --- Routes ---
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "version": "2.0-beta"})
	})

	// Static Files (Uploads)
	r.Static("/uploads", "./uploads")

	// Auth Routes (Public)
	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/verify-email", authHandler.VerifyEmail)
		authGroup.POST("/resend-verification", authHandler.ResendVerification)
	}

	// Background services context
	bgCtx, bgCancel := context.WithCancel(context.Background())
	defer bgCancel()

	api := r.Group("/api/v1")
	api.Use(middleware.AuthMiddleware()) // Protected!
	{
		// Board Routes
		api.GET("/boards", boardHandler.GetBoards)
		api.POST("/boards", boardHandler.CreateBoard) // New Board
		api.GET("/boards/:id", boardHandler.GetBoardByID)
		api.PATCH("/boards/:id", boardHandler.UpdateBoard) // Add Update route
		api.POST("/boards/:id/background", boardHandler.UploadBoardBackground)
		api.GET("/boards/:id/archived-cards", boardHandler.ListArchivedCards)
		api.PATCH("/boards/:id/star", boardHandler.ToggleStar)
		api.DELETE("/boards/:id", boardHandler.DeleteBoard)

		// Templates
		templateHandler := handlers.NewTemplateHandler(db)
		api.GET("/templates/boards", templateHandler.GetBoardTemplates)

		// Columns
		columnHandler := handlers.NewColumnHandler(db, hub)
		api.POST("/columns", columnHandler.CreateColumn)
		api.PATCH("/columns/:id", columnHandler.UpdateColumn)
		api.DELETE("/columns/:id", columnHandler.DeleteColumn)
		api.PATCH("/columns/:id/move", columnHandler.MoveColumn)

		// Activity Service
		activityService := services.NewActivityService(db)
		activityHandler := handlers.NewActivityHandler(activityService)
		api.GET("/boards/:id/activity", activityHandler.GetBoardActivity)
		api.GET("/cards/:id/activity", activityHandler.GetCardActivity)

		notificationService := services.NewNotificationService(db, hub, emailService)
		notificationHandler := handlers.NewNotificationHandler(notificationService)
		api.GET("/notifications", notificationHandler.GetNotifications)
		api.PATCH("/notifications/:id/read", notificationHandler.MarkAsRead)
		api.POST("/notifications/read-all", notificationHandler.MarkAllAsRead)

		// Automation
		autoRepo := repository.NewAutomationRepository(db)
		automationService := services.NewAutomationService(autoRepo)
		automationService.SetDependencies(db, notificationService)
		automationHandler := handlers.NewAutomationHandler(automationService)

		// Subscriptions
		subRepo := repository.NewSubscriptionRepository(db)
		subService := services.NewSubscriptionService(subRepo)
		subHandler := handlers.NewSubscriptionHandler(subService)

		// Due Date Reminder Scheduler
		reminderIntervalMins := 15
		reminderWindowHours := 24
		if v := os.Getenv("DUE_REMINDER_INTERVAL_MINUTES"); v != "" {
			if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
				reminderIntervalMins = parsed
			}
		}
		if v := os.Getenv("DUE_REMINDER_WINDOW_HOURS"); v != "" {
			if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
				reminderWindowHours = parsed
			}
		}
		dueReminderService := services.NewDueDateReminderService(
			db,
			notificationService,
			subService,
			automationService,
			time.Duration(reminderWindowHours)*time.Hour,
		)
		go dueReminderService.Start(bgCtx, time.Duration(reminderIntervalMins)*time.Minute)

		adminHandler := handlers.NewAdminHandler(db, dueReminderService)

		// Cards
		cardRepo := repository.NewCardRepository(db)
		cardService := services.NewCardService(cardRepo, automationService)
		automationService.SetExecutor(cardService)

		cardHandler := handlers.NewCardHandler(cardService, activityService, notificationService, subService, hub) // Inject NotificationService and SubscriptionService

		api.POST("/columns/:id/cards", cardHandler.Create)
		api.GET("/cards/:id", cardHandler.GetByID) // Deep Card fetch
		api.PATCH("/cards/:id", cardHandler.Update)
		api.DELETE("/cards/:id", cardHandler.Delete)
		api.PATCH("/cards/:id/move", cardHandler.Move)
		api.POST("/cards/:id/archive", cardHandler.Archive)
		api.POST("/cards/:id/restore", cardHandler.Restore)
		api.POST("/cards/:id/copy", cardHandler.Copy)
		api.POST("/cards/:id/template", cardHandler.SaveAsTemplate)
		api.GET("/cards/templates", cardHandler.GetTemplates)

		// Automation Routes
		api.GET("/boards/:id/rules", automationHandler.GetRules)
		api.POST("/boards/:id/rules", automationHandler.CreateRule)
		api.DELETE("/rules/:ruleId", automationHandler.DeleteRule)
		api.PATCH("/rules/:ruleId/toggle", automationHandler.ToggleRule)

		api.POST("/subscribe/:id", subHandler.Subscribe)
		api.DELETE("/subscribe/:id", subHandler.Unsubscribe)
		api.GET("/subscribe/:id/status", subHandler.Status)

		// Checklists
		checklistHandler := handlers.NewChecklistHandler(db, hub, notificationService, subService, automationService)

		api.POST("/cards/:id/checklists", checklistHandler.CreateChecklist)
		api.DELETE("/checklists/:id", checklistHandler.DeleteChecklist)
		api.POST("/checklists/:id/items", checklistHandler.CreateItem)
		api.PATCH("/checklists/:id/move", checklistHandler.MoveChecklist)
		api.PATCH("/checklist-items/:id", checklistHandler.ToggleItem)
		api.PATCH("/checklist-items/:id/move", checklistHandler.MoveItem)
		api.DELETE("/checklist-items/:id", checklistHandler.DeleteItem)

		// Analytics
		analyticsHandler := handlers.NewAnalyticsHandler(db)
		api.GET("/boards/:id/analytics", analyticsHandler.GetBoardAnalytics)

		// Labels
		labelHandler := handlers.NewLabelHandler(db, hub)
		api.GET("/boards/:id/labels", labelHandler.GetBoardLabels)
		api.POST("/boards/:id/labels", labelHandler.CreateLabel)
		api.PATCH("/labels/:id", labelHandler.UpdateLabel)
		api.DELETE("/labels/:id", labelHandler.DeleteLabel)

		// Comments
		commentService := services.NewCommentService(db, activityService)
		commentHandler := handlers.NewCommentHandler(commentService, notificationService, subService, db, hub)
		api.POST("/cards/:id/comments", commentHandler.CreateComment)
		api.DELETE("/comments/:id", commentHandler.DeleteComment)

		// Card Metadata
		api.POST("/cards/:id/labels/:labelId", cardHandler.AddLabel)
		api.DELETE("/cards/:id/labels/:labelId", cardHandler.RemoveLabel)
		api.POST("/cards/:id/members/:userId", cardHandler.AddMember)
		api.DELETE("/cards/:id/members/:userId", cardHandler.RemoveMember)

		// Attachments
		attachmentHandler := handlers.NewAttachmentHandler(db, hub, notificationService, subService)
		api.POST("/cards/:id/attachments", attachmentHandler.UploadAttachment)
		api.DELETE("/attachments/:attachmentId", attachmentHandler.DeleteAttachment)
		api.POST("/cards/:id/cover", attachmentHandler.MakeCover)
		api.DELETE("/cards/:id/cover", attachmentHandler.RemoveCover)

		// Workspaces
		workspaceHandler := handlers.NewWorkspaceHandler(db, hub, emailService, activityService) // Inject ActivityService
		api.GET("/workspaces", workspaceHandler.ListWorkspaces)
		api.POST("/workspaces", workspaceHandler.CreateWorkspace)
		api.PATCH("/workspaces/:id", workspaceHandler.UpdateWorkspace) // Rename
		api.DELETE("/workspaces/:id", workspaceHandler.DeleteWorkspace)
		api.POST("/workspaces/:id/members", workspaceHandler.InviteMember)
		api.DELETE("/workspaces/:id/members/:userId", workspaceHandler.RemoveMember)
		api.GET("/invitations", workspaceHandler.ListPendingInvitations)
		api.POST("/invitations/:id/accept", workspaceHandler.AcceptInvitation)
		api.POST("/invitations/:id/decline", workspaceHandler.DeclineInvitation)

		// Leave Workspace
		api.POST("/workspaces/:id/leave", workspaceHandler.LeaveWorkspace)

		// Member Management
		api.GET("/workspaces/:id/members", workspaceHandler.ListMembers)
		api.PATCH("/workspaces/:id/members/:userId", workspaceHandler.UpdateMemberRole)

		// Join Requests
		api.POST("/workspaces/:id/request", workspaceHandler.RequestToJoin)
		api.GET("/workspaces/:id/requests", workspaceHandler.ListJoinRequests)
		api.POST("/workspaces/:id/requests/:userId/approve", workspaceHandler.ApproveJoinRequest)
		api.POST("/workspaces/:id/requests/:userId/decline", workspaceHandler.DeclineJoinRequest)

		// Invite Links
		api.POST("/workspaces/:id/invite-link", workspaceHandler.CreateInviteLink)
		api.GET("/workspaces/:id/invite-link", workspaceHandler.GetInviteLink)
		api.DELETE("/workspaces/:id/invite-link", workspaceHandler.RevokeInviteLink)
		api.POST("/join/:token", workspaceHandler.JoinViaLink)

		// Users
		userHandler := handlers.NewUserHandler(db, emailService)
		api.GET("/users", authHandler.SearchUsers) // Keep existing search
		api.GET("/users/me", userHandler.GetMe)
		api.PATCH("/users/me", userHandler.UpdateProfile)
		api.POST("/users/me/avatar", userHandler.UploadAvatar)
		api.GET("/users/me/preferences", userHandler.GetPreferences)
		api.PUT("/users/me/preferences", userHandler.UpdatePreferences)
		api.GET("/users/me/activity", userHandler.GetUserActivity)
		api.PATCH("/users/me/onboarding", userHandler.CompleteOnboarding)
		api.POST("/admin/reminders/run", adminHandler.RunDueDateReminders)

		// Custom Fields
		cfRepo := repository.NewCustomFieldRepository(db)
		cfService := services.NewCustomFieldService(cfRepo)
		cfHandler := handlers.NewCustomFieldHandler(cfService, db, hub)

		api.POST("/boards/:id/fields", cfHandler.CreateField)
		api.GET("/boards/:id/fields", cfHandler.GetFields)
		api.DELETE("/fields/:id", cfHandler.DeleteField)
		api.POST("/cards/:id/fields/:field_id", cfHandler.SetValue)
		api.GET("/cards/:id/fields", cfHandler.GetValues)
	}

	r.GET("/ws", func(c *gin.Context) {
		realtime.ServeWs(hub, db, c)
	})

	// Run Server with Graceful Shutdown
	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with
	// a timeout of 5 seconds.
	quit := make(chan os.Signal, 1)
	// kill (no param) default send syscall.SIGTERM
	// kill -2 is syscall.SIGINT
	// kill -9 is syscall.SIGKILL but can't be catch, so don't need add it
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")
	bgCancel()

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown: ", err)
	}

	log.Println("Server exiting")
}
