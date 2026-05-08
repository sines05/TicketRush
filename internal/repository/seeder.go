package repository

import (
	"gorm.io/gorm"
)

// AutoSeedDatabase is now a no-op as seeding is handled by the seed binary
func AutoSeedDatabase(db *gorm.DB) {
	// Redundant logic removed. Use cmd/seed/main.go for seeding.
}
