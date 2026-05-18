package main

import (
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

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
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"reflect"
)

func main() {
	// 1. Load Configuration
	cfg := config.LoadConfig()
	configureGin()
	configureValidator()

	// 2. Initialize Database
	db := repository.NewPostgresDB(cfg)
	log.Println("Successfully connected to PostgreSQL")
	repository.RunMigrations(cfg)

	// 3. Initialize Redis
	rdb := repository.NewRedisClient(cfg)
	log.Println("Successfully connected to Redis")

	// 4. Setup WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()
	log.Println("WebSocket Hub started")

	userRepo := repository.NewUserRepository(db)
	eventRepo := repository.NewEventRepository(db)
	queueRepo := queue.NewRepository(rdb)
	queueService := queue.NewService(queueRepo, userRepo, eventRepo)
	queueHandler := handler.NewQueueHandler(queueService)

	emailService := service.NewEmailService(cfg)
	notificationService := service.NewNotificationService(emailService)
	notificationService.StartWorker()
	log.Println("Notification service started")

	authService := service.NewAuthService(userRepo, notificationService, rdb, cfg)
	authHandler := handler.NewAuthHandler(authService, cfg)

	eventMetricsRepo := repository.NewEventMetricsRepository(rdb)
	eventService := service.NewEventService(eventRepo, eventMetricsRepo)
	eventHandler := handler.NewEventHandler(eventService)

	orderRepo := repository.NewOrderRepository(db)
	orderService := service.NewOrderService(orderRepo, eventRepo, queueRepo, hub, notificationService, userRepo)
	orderHandler := handler.NewOrderHandler(orderService, queueService)

	membershipRepo := repository.NewMembershipRepository(db)
	membershipHandler := handler.NewMembershipHandler(membershipRepo, userRepo)

	reviewRepo := repository.NewReviewRepository(db)
	reviewHandler := handler.NewReviewHandler(reviewRepo, eventRepo)

	complaintRepo := repository.NewComplaintRepository(db)
	complaintHandler := handler.NewComplaintHandler(complaintRepo)

	adminUserHandler := handler.NewAdminUserHandler(userRepo, notificationService)

	aiProxyService := service.NewAIProxyService(cfg)
	aiProxyHandler := handler.NewAIProxyHandler(aiProxyService)

	aiInternalHandler := handler.NewAIInternalHandler(userRepo, orderRepo)

	workerService := worker.NewWorkerService(db, queueService, queueRepo, hub, orderRepo)
	workerService.StartWorkers()

	// 6. Setup Gin
	r := gin.New()
	r.Use(gin.Recovery())
	if err := r.SetTrustedProxies(nil); err != nil {
		log.Fatalf("Failed to configure trusted proxies: %v", err)
	}

	// CORS Middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Queue-Token", "X-Internal-Secret"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// API v1 Group
	v1 := r.Group("/api/v1")
	{
		// Auth Routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", middleware.RateLimitMiddleware(rdb, 100, 15*time.Minute), authHandler.Register)
			auth.POST("/login", middleware.RateLimitMiddleware(rdb, 100, 15*time.Minute), authHandler.Login)
			auth.POST("/verify-2fa", middleware.RateLimitMiddleware(rdb, 5, 15*time.Minute), authHandler.Verify2FALogin)
			auth.GET("/google/login", authHandler.GoogleLogin)
			auth.GET("/google/callback", authHandler.GoogleCallback)
			auth.GET("/facebook/login", authHandler.FacebookLogin)
			auth.GET("/facebook/callback", authHandler.FacebookCallback)
			auth.POST("/forgot-password", middleware.RateLimitMiddleware(rdb, 5, 15*time.Minute), authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
			auth.POST("/refresh", authHandler.Refresh)
			auth.POST("/logout", authHandler.Logout)
		}

		// Public Routes
		v1.POST("/chat", middleware.OptionalAuthMiddleware(authService), aiProxyHandler.Chat)
		v1.GET("/events", eventHandler.ListEvents)
		v1.GET("/events/hero", eventHandler.ListHeroEvents)
		v1.GET("/events/trending", eventHandler.ListTrendingEvents)
		v1.GET("/events/featured", eventHandler.ListFeaturedEvents)
		v1.GET("/events/:id", eventHandler.GetEvent)
		v1.GET("/events/:id/similar", eventHandler.GetSimilarEvents)
		v1.GET("/events/:id/seat-map", eventHandler.GetSeatMap)
		v1.GET("/events/:id/reviews", reviewHandler.GetEventReviews)
		v1.GET("/complaints/featured", complaintHandler.GetFeaturedComplaints)
		v1.GET("/membership/tiers", membershipHandler.GetTiers)

		// Protected Routes
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			// Queue
			protected.POST("/queue/join", queueHandler.JoinQueue)
			protected.GET("/queue/status", queueHandler.GetStatus)

			// Orders
			protected.POST("/orders/lock-seats", middleware.TwoFactorMiddleware(), orderHandler.LockSeats)
			protected.POST("/orders/checkout", middleware.TwoFactorMiddleware(), orderHandler.Checkout)
			protected.POST("/orders/cancel", orderHandler.CancelOrder)

			// Tickets
			protected.GET("/tickets/my-tickets", orderHandler.GetMyTickets)

			// 2FA Management
			protected.POST("/auth/setup-2fa", authHandler.Setup2FA)
			protected.POST("/auth/enable-2fa", authHandler.Enable2FA)
			protected.POST("/auth/disable-2fa", middleware.TwoFactorMiddleware(), authHandler.Disable2FA)

			// Membership
			protected.GET("/membership/me", membershipHandler.GetMyMembership)
			protected.POST("/membership/upgrade", middleware.TwoFactorMiddleware(), membershipHandler.UpgradeTier)

			// Reviews
			protected.POST("/reviews", reviewHandler.CreateReview)

			// Complaints
			protected.POST("/complaints", complaintHandler.CreateComplaint)
			protected.GET("/complaints/my", complaintHandler.GetMyComplaints)

			protected.GET("/users/me", authHandler.GetMe)
			protected.PATCH("/users/me", authHandler.UpdateMe)
			protected.POST("/users/change-password", middleware.TwoFactorMiddleware(), authHandler.ChangePassword)
			protected.POST("/users/notification-token", authHandler.UpdateNotificationToken)

			// Admin Routes
			admin := protected.Group("/admin", middleware.RoleMiddleware(models.RoleAdmin), middleware.TwoFactorMiddleware())
			{
				admin.GET("/events", eventHandler.ListEvents)
				admin.POST("/events", eventHandler.CreateEvent)
				admin.PUT("/events/:id", eventHandler.UpdateEvent)
				admin.DELETE("/events/:id", eventHandler.DeleteEvent)
				admin.GET("/dashboard/stats", eventHandler.GetStats)
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

	// Internal API Group for AI Agent
	internalAPI := r.Group("/api/internal/v1")
	internalAPI.Use(middleware.InternalAuthMiddleware(cfg))
	{
		internalAPI.GET("/events", eventHandler.ListEvents)
		internalAPI.GET("/user/profile", aiInternalHandler.GetUserProfile)
		internalAPI.GET("/user/orders", aiInternalHandler.GetUserOrders)
	}

	// WebSocket endpoint (outside v1 for simplicity or as needed)
	r.GET("/ws", func(c *gin.Context) {
		websocket.ServeWs(hub, authService, c.Writer, c.Request)
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK"})
	})

	log.Printf("Server starting on port %s...", cfg.Port)
	if err := serve(r, cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func configureGin() {
	if os.Getenv(gin.EnvGinMode) == "" {
		gin.SetMode(gin.ReleaseMode)
	}
}

func configureValidator() {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		v.RegisterTagNameFunc(func(fld reflect.StructField) string {
			name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
			if name == "-" {
				return ""
			}
			return name
		})
	}
}

func serve(handler http.Handler, port string) error {
	address := ":" + port
	listener, err := net.Listen("tcp", address)
	if err != nil {
		if isAddressInUse(err) {
			return errors.New("port " + port + " is already in use; stop the existing TicketRush server or run with another port, for example: $env:PORT='8081'; go run cmd/server/main.go")
		}
		return err
	}

	server := &http.Server{
		Addr:    address,
		Handler: handler,
	}
	return server.Serve(listener)
}

func isAddressInUse(err error) bool {
	errText := strings.ToLower(err.Error())
	return strings.Contains(errText, "address already in use") ||
		strings.Contains(errText, "only one usage of each socket address")
}
