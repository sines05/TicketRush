package main

import (
	"fmt"
	"log"

	"ticketrush/internal/config"
	"ticketrush/internal/handler"
	"ticketrush/internal/middleware"
	"ticketrush/internal/models"
	"ticketrush/internal/queue"
	"ticketrush/internal/repository"
	"ticketrush/internal/service"
	"ticketrush/internal/websocket"
	"ticketrush/internal/worker"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load Configuration
	cfg := config.LoadConfig()

	// 2. Initialize Database
	db := repository.NewPostgresDB(cfg)
	log.Println("Successfully connected to PostgreSQL")

	// 3. Initialize Redis
	rdb := repository.NewRedisClient(cfg)
	log.Println("Successfully connected to Redis")

	// 4. Setup WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()
	log.Println("WebSocket Hub started")

	userRepo := repository.NewUserRepository(db)
	queueRepo := queue.NewRepository(rdb)
	queueService := queue.NewService(queueRepo, userRepo)
	queueHandler := handler.NewQueueHandler(queueService)

	emailService := service.NewEmailService(cfg)
	notificationService := service.NewNotificationService(emailService)
	notificationService.StartWorker()
	log.Println("Notification service started")

	authService := service.NewAuthService(userRepo, notificationService, cfg)
	authHandler := handler.NewAuthHandler(authService, cfg)

	eventRepo := repository.NewEventRepository(db)
	eventMetricsRepo := repository.NewEventMetricsRepository(rdb)
	eventService := service.NewEventService(eventRepo, eventMetricsRepo, db)
	eventHandler := handler.NewEventHandler(eventService)

	orderRepo := repository.NewOrderRepository(db)
	orderService := service.NewOrderService(orderRepo, eventRepo, queueRepo, hub, notificationService, userRepo)
	orderHandler := handler.NewOrderHandler(orderService, queueService)

	membershipRepo := repository.NewMembershipRepository(db)
	membershipHandler := handler.NewMembershipHandler(membershipRepo, userRepo)

	reviewRepo := repository.NewReviewRepository(db)
	reviewHandler := handler.NewReviewHandler(reviewRepo)

	complaintRepo := repository.NewComplaintRepository(db)
	complaintHandler := handler.NewComplaintHandler(complaintRepo)

	adminDashboardHandler := handler.NewAdminDashboardHandler(orderRepo, eventRepo)
	adminUserHandler := handler.NewAdminUserHandler(userRepo, notificationService)

	workerService := worker.NewWorkerService(db, queueService, queueRepo, hub, orderRepo)
	workerService.StartWorkers()

	// 6. Setup Gin
	r := gin.Default()

	// CORS Middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Queue-Token"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// API v1 Group
	v1 := r.Group("/api/v1")
	{
		// Auth Routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/verify-2fa", authHandler.Verify2FALogin)
			auth.GET("/google/login", authHandler.GoogleLogin)
			auth.GET("/google/callback", authHandler.GoogleCallback)
			auth.GET("/facebook/login", authHandler.FacebookLogin)
			auth.GET("/facebook/callback", authHandler.FacebookCallback)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
		}

		// Public Routes
		v1.GET("/events", eventHandler.ListEvents)
		v1.GET("/events/trending", eventHandler.ListTrendingEvents)
		v1.GET("/events/featured", eventHandler.ListFeaturedEvents)
		v1.GET("/events/:id", eventHandler.GetEvent)
		v1.GET("/events/:id/seat-map", eventHandler.GetSeatMap)
		v1.GET("/events/:id/reviews", reviewHandler.GetEventReviews)
		v1.GET("/membership/tiers", membershipHandler.GetTiers)

		// Protected Routes
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			// Queue
			protected.POST("/queue/join", queueHandler.JoinQueue)
			protected.GET("/queue/status", queueHandler.GetStatus)

			// Orders
			protected.POST("/orders/lock-seats", orderHandler.LockSeats)
			protected.POST("/orders/checkout", orderHandler.Checkout)
			protected.POST("/orders/cancel", orderHandler.CancelOrder)

			// Tickets
			protected.GET("/tickets/my-tickets", orderHandler.GetMyTickets)

			// 2FA Management
			protected.POST("/auth/setup-2fa", authHandler.Setup2FA)
			protected.POST("/auth/enable-2fa", authHandler.Enable2FA)
			protected.POST("/auth/disable-2fa", authHandler.Disable2FA)

			// Membership
			protected.GET("/membership/me", membershipHandler.GetMyMembership)
			protected.POST("/membership/upgrade", membershipHandler.UpgradeTier)

			// Reviews
			protected.POST("/reviews", reviewHandler.CreateReview)

			// Complaints
			protected.POST("/complaints", complaintHandler.CreateComplaint)
			protected.GET("/complaints/my", complaintHandler.GetMyComplaints)

			protected.GET("/users/me", authHandler.GetMe)
			protected.PATCH("/users/me", authHandler.UpdateMe)
			protected.POST("/users/change-password", authHandler.ChangePassword)
			protected.POST("/users/notification-token", authHandler.UpdateNotificationToken)

			// Admin Routes
			admin := protected.Group("/admin")
			admin.Use(middleware.RoleMiddleware(models.RoleAdmin))
			{
				admin.GET("/events", eventHandler.ListEvents)
				admin.POST("/events", eventHandler.CreateEvent)
				admin.PUT("/events/:id", eventHandler.UpdateEvent)
				admin.DELETE("/events/:id", eventHandler.DeleteEvent)
				admin.GET("/dashboard/stats", adminDashboardHandler.GetStats)
				admin.GET("/tickets", orderHandler.GetTickets)
				admin.POST("/tickets/check-in", orderHandler.CheckInTicket)
				admin.GET("/complaints", complaintHandler.AdminGetAllComplaints)
				admin.PATCH("/complaints/:id", complaintHandler.AdminUpdateComplaintStatus)

				admin.GET("/users", adminUserHandler.ListUsers)
				admin.PATCH("/users/:id/role", adminUserHandler.UpdateUserRole)
				admin.PATCH("/users/:id/membership", adminUserHandler.UpdateUserMembership)
				admin.DELETE("/users/:id", adminUserHandler.DeleteUser)
				admin.POST("/users/:id/notify", adminUserHandler.NotifyUser)
			}
		}
	}

	// WebSocket endpoint (outside v1 for simplicity or as needed)
	r.GET("/ws", func(c *gin.Context) {
		websocket.ServeWs(hub, c.Writer, c.Request)
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK"})
	})

	log.Printf("Server starting on port %s...", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
