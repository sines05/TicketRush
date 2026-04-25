package main

import (
	"fmt"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"ticketrush/internal/config"
	"ticketrush/internal/handler"
	"ticketrush/internal/middleware"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/service"
)

func main() {
	// 1. Load Configuration
	cfg := config.LoadConfig()

	// 2. Initialize Database
	db := repository.NewPostgresDB(cfg)
	fmt.Println("Successfully connected to PostgreSQL")

	// Run Migrations
	repository.RunMigrations(cfg)

	// 3. Initialize Redis
	rdb := repository.NewRedisClient(cfg)
	fmt.Println("Successfully connected to Redis")

	// 4. Setup WebSocket Hub
	hub := repository.NewHub()
	go hub.Run()
	fmt.Println("WebSocket Hub started")

	// 5. Setup Dependencies
	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo, cfg)
	authHandler := handler.NewAuthHandler(authService)

	eventRepo := repository.NewEventRepository(db)
	eventService := service.NewEventService(eventRepo, db)
	eventHandler := handler.NewEventHandler(eventService)

	orderRepo := repository.NewOrderRepository(db)
	orderService := service.NewOrderService(orderRepo, hub)
	orderHandler := handler.NewOrderHandler(orderService)

	queueRepo := repository.NewQueueRepository(rdb)
	queueService := service.NewQueueService(queueRepo)
	queueHandler := handler.NewQueueHandler(queueService)

	workerService := service.NewWorkerService(db, queueService, hub, orderRepo)
	workerService.StartWorkers()

	// 6. Setup Gin
	r := gin.Default()

	// CORS Middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
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
			auth.GET("/google/login", authHandler.GoogleLogin)
			auth.GET("/google/callback", authHandler.GoogleCallback)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
		}

		// Public Routes
		v1.GET("/events", eventHandler.ListEvents)
		v1.GET("/events/:id", eventHandler.GetEvent)
		v1.GET("/events/:id/seat-map", eventHandler.GetSeatMap)

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

			// Tickets
			protected.GET("/tickets/my-tickets", orderHandler.GetMyTickets)

			// Admin Routes
			admin := protected.Group("/admin")
			admin.Use(middleware.RoleMiddleware(models.RoleAdmin))
			{
				admin.POST("/events", eventHandler.CreateEvent)
				admin.GET("/dashboard/stats", eventHandler.GetStats)
			}
		}
	}

	// WebSocket endpoint (outside v1 for simplicity or as needed)
	r.GET("/ws", func(c *gin.Context) {
		repository.ServeWs(hub, c.Writer, c.Request)
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
