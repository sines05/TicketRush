package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
)

func main() {
	cfg := config.LoadConfig()
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Drop GORM tables
	db.Migrator().DropTable(&models.Ticket{}, &models.OrderItem{}, &models.Order{}, &models.Seat{}, &models.EventZone{}, &models.Event{}, &models.User{})
	
	// Drop schema_migrations
	if err := db.Exec("DROP TABLE IF EXISTS schema_migrations").Error; err != nil {
		log.Fatalf("Failed to drop schema_migrations: %v", err)
	}

	fmt.Println("Database cleaned up. You can now run migrations safely.")
}
