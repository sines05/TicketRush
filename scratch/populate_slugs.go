package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/utils"
)

func main() {
	cfg := config.LoadConfig()
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	var events []models.Event
	if err := db.Find(&events).Error; err != nil {
		log.Fatalf("Failed to fetch events: %v", err)
	}

	for _, e := range events {
		newSlug := utils.GenerateSlug(e.Title)
		fmt.Printf("Updating event %s: %s -> %s\n", e.ID, e.Title, newSlug)
		if err := db.Model(&e).Update("slug", newSlug).Error; err != nil {
			fmt.Printf("Failed to update slug for event %s: %v\n", e.ID, err)
		}
	}

	fmt.Println("All events updated with proper slugs.")
}
