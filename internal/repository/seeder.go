package repository

import (
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"ticketrush/internal/models"
	"ticketrush/internal/utils"
)

// AutoSeedDatabase automatically seeds the database if it's empty
func AutoSeedDatabase(db *gorm.DB) {
	// Check if users already exist
	var userCount int64
	if err := db.Model(&models.User{}).Count(&userCount).Error; err != nil {
		log.Printf("Failed to check users: %v", err)
		return
	}

	// If users exist, skip seeding
	if userCount > 0 {
		fmt.Println("Database already seeded, skipping seed")
		return
	}

	fmt.Println("Database is empty, auto-seeding...")

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)

	// ============================================================
	// 1. USERS
	// ============================================================
	fmt.Println("Creating users...")

	admin := models.User{
		Email:        "admin@ticketrush.com",
		PasswordHash: string(hashedPassword),
		FullName:     "Nguyen Quan Tri",
		Role:         models.RoleAdmin,
		Gender:       models.GenderMale,
		DateOfBirth:  time.Date(1990, 5, 15, 0, 0, 0, 0, time.UTC),
	}
	db.Create(&admin)

	customers := []models.User{
		{
			Email:        "customer@ticketrush.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Tran Van Khach",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(2000, 3, 20, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "linhchi@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Nguyen Linh Chi",
			Role:         models.RoleCustomer,
			Gender:       models.GenderFemale,
			DateOfBirth:  time.Date(2001, 7, 12, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "minhduc@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Pham Minh Duc",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(1998, 11, 5, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "thuytrang@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Le Thuy Trang",
			Role:         models.RoleCustomer,
			Gender:       models.GenderFemale,
			DateOfBirth:  time.Date(2003, 1, 28, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "hoangnam@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Vu Hoang Nam",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(1995, 9, 10, 0, 0, 0, 0, time.UTC),
		},
	}
	db.Create(&customers)

	// ============================================================
	// 2. EVENTS (Sample Concert Events)
	// ============================================================
	fmt.Println("Creating events...")

	events := []models.Event{
		{
			Title:       "Coldplay Concert 2026",
			Slug:        utils.GenerateSlug("Coldplay Concert 2026"),
			Description: "Experience the magic of Coldplay's best hits",
			Category:    "MUSIC",
			IsFeatured:  true,
			IsPublished: true,
			StartTime:   time.Date(2026, 6, 15, 20, 0, 0, 0, time.UTC),
			EndTime:     time.Date(2026, 6, 15, 23, 0, 0, 0, time.UTC),
		},
		{
			Title:       "Taylor Swift Eras Tour",
			Slug:        utils.GenerateSlug("Taylor Swift Eras Tour"),
			Description: "The biggest concert of the year",
			Category:    "MUSIC",
			IsFeatured:  true,
			IsPublished: true,
			StartTime:   time.Date(2026, 7, 20, 19, 0, 0, 0, time.UTC),
			EndTime:     time.Date(2026, 7, 20, 22, 0, 0, 0, time.UTC),
		},
		{
			Title:       "Dua Lipa Live Concert",
			Slug:        utils.GenerateSlug("Dua Lipa Live Concert"),
			Description: "Dance with the disco queen",
			Category:    "MUSIC",
			IsFeatured:  false,
			IsPublished: true,
			StartTime:   time.Date(2026, 8, 10, 19, 30, 0, 0, time.UTC),
			EndTime:     time.Date(2026, 8, 10, 22, 30, 0, 0, time.UTC),
		},
	}
	db.Create(&events)

	// Create zones and seats for ALL events
	for _, evt := range events {
		zones := []models.EventZone{
			{
				EventID:     evt.ID,
				Name:        "VIP",
				Price:       1500000,
				TotalRows:   10,
				SeatsPerRow: 50,
			},
			{
				EventID:     evt.ID,
				Name:        "STANDARD",
				Price:       500000,
				TotalRows:   60,
				SeatsPerRow: 50,
			},
			{
				EventID:     evt.ID,
				Name:        "ECONOMY",
				Price:       250000,
				TotalRows:   30,
				SeatsPerRow: 50,
			},
		}
		db.Create(&zones)

		// Create seats for each zone
		for _, zone := range zones {
			var seats []models.Seat
			for row := 1; row <= zone.TotalRows; row++ {
				rowLabel := fmt.Sprintf("%c", rune('A'+row-1))
				for col := 1; col <= zone.SeatsPerRow; col++ {
					seats = append(seats, models.Seat{
						ZoneID:     zone.ID,
						RowLabel:   rowLabel,
						SeatNumber: col,
						Status:     models.SeatAvailable,
					})
				}
			}
			db.Create(&seats)
		}
	}

	fmt.Println("Auto-seeding completed successfully!")
}
