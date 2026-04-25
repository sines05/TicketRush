package main

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.LoadConfig()
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Drop existing tables to start fresh with UUIDs
	db.Exec("DROP TABLE IF EXISTS schema_migrations")
	db.Migrator().DropTable(&models.PasswordReset{}, &models.Ticket{}, &models.OrderItem{}, &models.Order{}, &models.Seat{}, &models.EventZone{}, &models.Event{}, &models.User{})

	// Re-run migrations
	repository.RunMigrations(cfg)
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	admin := models.User{
		Email:        "admin@ticketrush.com",
		PasswordHash: string(hashedPassword),
		FullName:     "System Admin",
		Role:         models.RoleAdmin,
		Gender:       models.GenderOther,
		DateOfBirth:  time.Now().AddDate(-30, 0, 0),
	}
	db.Where(models.User{Email: admin.Email}).FirstOrCreate(&admin)

	// 2. Create Sample Event
	event := models.Event{
		Title:       "Concert of the Year 2026",
		Description: "The most anticipated concert featuring top global artists. Don't miss the chance to experience the magic!",
		BannerURL:   "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1000&q=80",
		StartTime:   time.Now().AddDate(0, 1, 0),
		EndTime:     time.Now().AddDate(0, 1, 1),
		IsPublished: true,
	}
	db.Where(models.Event{Title: event.Title}).FirstOrCreate(&event)

	// 3. Create Zones and Seats
	zones := []models.EventZone{
		{
			EventID:     event.ID,
			Name:        "VIP",
			Price:       500,
			TotalRows:   2,
			SeatsPerRow: 5,
		},
		{
			EventID:     event.ID,
			Name:        "General",
			Price:       150,
			TotalRows:   5,
			SeatsPerRow: 10,
		},
	}

	for _, z := range zones {
		var existingZone models.EventZone
		if err := db.Where("event_id = ? AND name = ?", event.ID, z.Name).First(&existingZone).Error; err != nil {
			db.Create(&z)
			// Generate Seats
			for r := 0; r < z.TotalRows; r++ {
				rowLabel := string(rune('A' + r))
				for s := 1; s <= z.SeatsPerRow; s++ {
					seat := models.Seat{
						ZoneID:     z.ID,
						RowLabel:   rowLabel,
						SeatNumber: s,
						Status:     models.SeatAvailable,
					}
					db.Create(&seat)
				}
			}
		}
	}

	fmt.Println("Seeding completed successfully!")
}
